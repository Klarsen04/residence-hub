// Local (on-device) AI model catalog for the Residence Hub chat bot.
//
// Two inference engines, chosen automatically by browser capability
// (see engine.ts → detectEngine):
//   • webllm — WebGPU-accelerated (fast). Chrome/Edge/Safari 26+.
//   • wllama — CPU/WASM (slower, tiny models only) fallback that runs
//     EVERYWHERE, including Firefox, whose WebGPU limits WebLLM can't meet.
//
// Both run 100% in the browser: no API key, no server cost, no daily limit,
// nothing leaves the device. Independent of the cloud AI Planner.

export type EngineKind = "webllm" | "wllama";

export interface LocalModel {
  /** Stable unique key used by the picker. */
  id: string;
  label: string;
  /** Rough download size, shown so users know the first-load cost. */
  size: string;
  /** One-line tradeoff hint. */
  note: string;
  engine: EngineKind;
  /** WebLLM prebuilt model id (engine === "webllm"). */
  webllmId?: string;
  /** Hugging Face GGUF source (engine === "wllama"). */
  hf?: { repo: string; file: string };
}

// Short persona — small models follow concise system prompts far better.
export const SYSTEM_PROMPT = `You are the Residence Hub assistant, a friendly helper for student Resident Assistants (RAs) and residence-life staff.

You help with: brainstorming floor events, community-building ideas, budgets, wellness and study-break activities, roommate/conflict advice, and general residence-life questions.

Guidelines:
- Be warm, concise, and practical. Prefer short paragraphs and bullet points.
- When asked for event ideas, include a rough budget or supply list when it helps.
- You run entirely offline in the user's browser, so never claim to look things up online or access their real data.
- If you're unsure, say so briefly rather than inventing specifics.`;

// --- WebGPU (fast) models — curated, lightest → strongest. All 4-bit q4f16. ---
export const WEBLLM_MODELS: LocalModel[] = [
  { id: "qwen2.5-0.5b", engine: "webllm", webllmId: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 (0.5B)", size: "~0.5 GB", note: "Tiniest. Runs on almost anything." },
  { id: "llama-3.2-1b", engine: "webllm", webllmId: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    label: "Llama 3.2 (1B)", size: "~0.9 GB", note: "Fast, broad-device default." },
  { id: "qwen2.5-1.5b", engine: "webllm", webllmId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 (1.5B)", size: "~1.1 GB", note: "Strong at lists & structured answers." },
  { id: "gemma-2-2b", engine: "webllm", webllmId: "gemma-2-2b-it-q4f16_1-MLC",
    label: "Gemma 2 (2B)", size: "~1.6 GB", note: "Google's Gemma — strong for its size." },
  { id: "llama-3.2-3b", engine: "webllm", webllmId: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    label: "Llama 3.2 (3B)", size: "~2.3 GB", note: "Noticeably smarter. Needs a decent GPU." },
  { id: "qwen2.5-7b", engine: "webllm", webllmId: "Qwen2.5-7B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 (7B)", size: "~4.7 GB", note: "Best quality. Strong desktop GPU only." },
];

// --- CPU/WASM fallback models — keep tiny; CPU inference is slow. ---
export const WLLAMA_MODELS: LocalModel[] = [
  { id: "w-qwen2.5-0.5b", engine: "wllama",
    hf: { repo: "bartowski/Qwen2.5-0.5B-Instruct-GGUF", file: "Qwen2.5-0.5B-Instruct-Q4_K_M.gguf" },
    label: "Qwen 2.5 (0.5B)", size: "~0.4 GB", note: "Fastest on CPU. Best pick for Firefox." },
  { id: "w-llama-3.2-1b", engine: "wllama",
    hf: { repo: "bartowski/Llama-3.2-1B-Instruct-GGUF", file: "Llama-3.2-1B-Instruct-Q4_K_M.gguf" },
    label: "Llama 3.2 (1B)", size: "~0.8 GB", note: "Better replies, slower on CPU." },
];

export function modelsForEngine(engine: EngineKind): LocalModel[] {
  return engine === "webllm" ? WEBLLM_MODELS : WLLAMA_MODELS;
}
