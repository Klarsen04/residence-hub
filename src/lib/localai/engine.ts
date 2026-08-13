// Engine abstraction over the two in-browser inference backends. Both are
// dynamically imported so their (multi-MB) runtimes stay out of the initial
// bundle and never run during SSR.

import type { EngineKind, LocalModel } from "./models";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type ProgressFn = (pct: number, text: string) => void;
export type DeltaFn = (fullText: string) => void;

export interface LoadedEngine {
  kind: EngineKind;
  /** Stream a reply; calls onDelta with the growing text, resolves to the full text. */
  chat: (messages: ChatMessage[], onDelta: DeltaFn) => Promise<string>;
}

// wllama's wasm is served from the jsDelivr CDN (pinned to the installed
// version) so we don't have to teach webpack to emit the .wasm asset.
const WLLAMA_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@wllama/wllama@3.5.1/esm/wasm/wllama.wasm";

/**
 * Pick the best engine this browser can actually run. WebLLM needs WebGPU with
 * maxStorageBuffersPerShaderStage ≥ 10 (Firefox exposes only 8, so it falls to
 * wllama). wllama (CPU/WASM) runs everywhere as the universal fallback.
 */
export async function detectEngine(): Promise<EngineKind> {
  const gpu = (typeof navigator !== "undefined" ? (navigator as any).gpu : null);
  if (!gpu) return "wllama";
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) return "wllama";
    const limit = adapter.limits?.maxStorageBuffersPerShaderStage ?? 0;
    return limit >= 10 ? "webllm" : "wllama";
  } catch {
    return "wllama";
  }
}

export async function loadEngine(model: LocalModel, onProgress: ProgressFn): Promise<LoadedEngine> {
  return model.engine === "webllm"
    ? loadWebllm(model, onProgress)
    : loadWllama(model, onProgress);
}

async function loadWebllm(model: LocalModel, onProgress: ProgressFn): Promise<LoadedEngine> {
  const webllm = await import("@mlc-ai/web-llm");
  const engine = await webllm.CreateMLCEngine(model.webllmId!, {
    initProgressCallback: (r: { progress: number; text: string }) =>
      onProgress(Math.round((r.progress || 0) * 100), r.text || ""),
  });
  return {
    kind: "webllm",
    async chat(messages, onDelta) {
      const chunks = await engine.chat.completions.create({
        messages,
        stream: true,
        temperature: 0.7,
      });
      let reply = "";
      for await (const chunk of chunks) {
        reply += chunk.choices?.[0]?.delta?.content || "";
        onDelta(reply);
      }
      return reply;
    },
  };
}

async function loadWllama(model: LocalModel, onProgress: ProgressFn): Promise<LoadedEngine> {
  // Explicit esm path: the package's "main" points at a non-existent root file.
  const { Wllama } = await import("@wllama/wllama/esm/index.js");
  const wllama = new Wllama({ default: WLLAMA_WASM_URL });
  // Load from the direct resolve URL instead of loadModelFromHF(): the HF-API
  // metadata lookup that loadModelFromHF() does 404s on repos migrated to HF's
  // Xet storage (which most bartowski GGUFs now use). The plain resolve URL
  // still 302-redirects to the CDN and downloads fine in-browser.
  const url = `https://huggingface.co/${model.hf!.repo}/resolve/main/${model.hf!.file}`;
  await wllama.loadModelFromUrl(url, {
    n_ctx: 2048,
    n_gpu_layers: 0, // force pure CPU — guarantees it runs on Firefox etc.
    progressCallback: ({ loaded, total }: { loaded: number; total: number }) =>
      onProgress(total ? Math.round((loaded / total) * 100) : 0, "Downloading model…"),
  });
  return {
    kind: "wllama",
    async chat(messages, onDelta) {
      const stream = await wllama.createChatCompletion({
        messages,
        max_tokens: 512,
        temperature: 0.7,
        stream: true,
      });
      let reply = "";
      for await (const chunk of stream as AsyncIterable<any>) {
        reply += chunk.choices?.[0]?.delta?.content ?? "";
        onDelta(reply);
      }
      return reply;
    },
  };
}
