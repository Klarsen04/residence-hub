// AI event-planner text generation with cross-provider fallback.
//
// Two independent providers, each with its own API key and OpenAI-compatible
// endpoint, tried in order:
//   1. OpenRouter — free instruct-model chain, native in-request failover
//   2. NVIDIA NIM — z-ai/glm-5.2 etc.
//
// OpenRouter fails over *within itself* (its `models` array). This module adds
// the jump *between* providers: if the whole OpenRouter attempt fails (quota,
// outage, bad key), it falls through to NVIDIA. Order is configurable via
// AI_PROVIDER_ORDER. Keys live in env only (set them in Vercel), never in code.
//
// Only CHAT models that return clean `content` belong here. Reasoning/oss models
// that answer in a `reasoning` field or leak <|control|> tokens are avoided.

export class AIPlannerError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "AIPlannerError";
  }
}

export interface AIResult {
  text: string;
  model: string;
  provider: string;
}

type ProviderName = "openrouter" | "nvidia" | "gemini";

interface ProviderConfig {
  name: ProviderName;
  url: string;
  modelsUrl?: string; // catalog endpoint for pruning invalid IDs (OpenRouter)
  apiKey: string | undefined;
  models: string[];
  maxModelsPerRequest: number; // OpenRouter caps its `models` array at 3
  extraHeaders?: Record<string, string>;
}

// ---- Default model chains (override via env, comma-separated) ----

// OpenRouter: verified-live FREE instruct models, strongest → lightest.
const OPENROUTER_DEFAULT = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
];

// NVIDIA NIM: clean instruct models (glm-5.2 returns well-formatted plans).
const NVIDIA_DEFAULT = [
  "z-ai/glm-5.2",
  "nvidia/nemotron-3-ultra-550b-a55b",
];

// Google Gemini via its OpenAI-compatible endpoint. Flash-Lite leads — it has
// the largest free daily quota (~1000/day) — with Flash as a same-provider
// fallback. Both are fast and return clean structured text.
const GEMINI_DEFAULT = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
];

function envList(name: string, fallback: string[]): string[] {
  const v = process.env[name]?.split(",").map((s) => s.trim()).filter(Boolean);
  return v && v.length > 0 ? v : fallback;
}

function providers(): ProviderConfig[] {
  const all: Record<ProviderName, ProviderConfig> = {
    openrouter: {
      name: "openrouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      modelsUrl: "https://openrouter.ai/api/v1/models",
      apiKey: process.env.OPENROUTER_API_KEY,
      models: envList("OPENROUTER_MODELS", OPENROUTER_DEFAULT),
      maxModelsPerRequest: 3,
      extraHeaders: {
        "HTTP-Referer": process.env.NEXTAUTH_URL || "https://residence-hub.app",
        "X-Title": "Residence Hub",
      },
    },
    nvidia: {
      name: "nvidia",
      url: "https://integrate.api.nvidia.com/v1/chat/completions",
      apiKey: process.env.NVIDIA_API_KEY,
      models: envList("NVIDIA_MODELS", NVIDIA_DEFAULT),
      maxModelsPerRequest: 1, // NIM takes a single `model` per request
    },
    gemini: {
      name: "gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiKey: process.env.GEMINI_API_KEY,
      models: envList("GEMINI_MODELS", GEMINI_DEFAULT),
      maxModelsPerRequest: 1, // one `model` per request
    },
  };

  // Order is configurable; only providers with a key configured are used.
  // Gemini Flash-Lite first — it's the largest reliable free daily bucket
  // (~1000/day) — then OpenRouter, then NVIDIA (rate-limited, no hard daily cap).
  const order = envList("AI_PROVIDER_ORDER", ["gemini", "openrouter", "nvidia"]) as ProviderName[];
  return order.map((n) => all[n]).filter((p): p is ProviderConfig => !!p && !!p.apiKey);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ---- OpenRouter catalog pruning (one bad ID 404s the whole request) ----
const _catalogCache = new Map<string, { ids: Set<string>; at: number }>();
const CATALOG_TTL_MS = 60 * 60 * 1000;

async function pruneToValid(p: ProviderConfig, ids: string[]): Promise<string[]> {
  if (!p.modelsUrl || !p.apiKey) return ids;
  const cached = _catalogCache.get(p.name);
  const now = Date.now();
  let valid = cached && now - cached.at < CATALOG_TTL_MS ? cached.ids : null;
  if (!valid) {
    try {
      const res = await fetch(p.modelsUrl, { headers: { Authorization: `Bearer ${p.apiKey}` } });
      if (res.ok) {
        const data = await res.json();
        valid = new Set<string>((data?.data || []).map((m: { id: string }) => m.id));
        _catalogCache.set(p.name, { ids: valid, at: now });
      }
    } catch {
      // Couldn't fetch catalog — use ids as-is.
    }
  }
  if (!valid) return ids;
  const pruned = ids.filter((id) => valid!.has(id));
  return pruned.length > 0 ? pruned : ids;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callGroup(
  p: ProviderConfig,
  models: string[],
  messages: ChatMessage[]
): Promise<AIResult> {
  // OpenRouter accepts a `models` array (native failover); single-model
  // providers (NVIDIA) take a `model` string.
  const body: Record<string, unknown> = {
    messages,
    temperature: 0.8,
    max_tokens: 2048,
  };
  if (p.maxModelsPerRequest > 1 && models.length > 1) {
    body.models = models;
  } else {
    body.model = models[0];
  }

  const res = await fetch(p.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${p.apiKey}`,
      "Content-Type": "application/json",
      ...(p.extraHeaders || {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new AIPlannerError(`${p.name} ${res.status}: ${detail}`.slice(0, 300), res.status);
  }

  const data = await res.json();
  const raw: string | undefined = data?.choices?.[0]?.message?.content;
  // Strip stray chat-control tokens some models leak; require real text.
  const text = raw?.replace(/<\|[^|]*\|>/g, "").trim();
  if (!text) throw new AIPlannerError(`${p.name} returned an empty response.`);
  return { text, model: data?.model || models[0] || "unknown", provider: p.name };
}

function isFatal4xx(err: unknown): boolean {
  // 4xx that isn't rate-limiting won't improve on retry (bad key/request).
  return (
    err instanceof AIPlannerError &&
    !!err.status &&
    err.status >= 400 &&
    err.status < 500 &&
    err.status !== 429
  );
}

/**
 * Multi-turn chat generation. Pass the full message array (system + history +
 * latest user turn). Tries each provider in order and each provider's model
 * chain, returning the first clean reply. Throws AIPlannerError (503 if no
 * provider configured) or the last error if everything fails.
 */
export async function generateChat(messages: ChatMessage[]): Promise<AIResult> {
  const configured = providers();
  if (configured.length === 0) {
    throw new AIPlannerError("No AI provider is configured. Set OPENROUTER_API_KEY, GEMINI_API_KEY, or NVIDIA_API_KEY.", 503);
  }

  let lastError: unknown;
  for (const p of configured) {
    const models = await pruneToValid(p, p.models);
    const groups = chunk(models, p.maxModelsPerRequest);
    for (const group of groups) {
      try {
        return await callGroup(p, group, messages);
      } catch (err) {
        lastError = err;
        if (isFatal4xx(err)) break; // provider unusable — next provider
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new AIPlannerError("All AI providers and models failed.");
}

/** Single-prompt convenience wrapper (kept for the legacy form endpoint). */
export function generatePlan(prompt: string): Promise<AIResult> {
  return generateChat([{ role: "user", content: prompt }]);
}
