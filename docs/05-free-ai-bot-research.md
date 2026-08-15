# Deep Research — How to Build a Free AI Bot

_Compiled 2026-08-11. Four parallel research streams (in-browser inference, self-hosting, free cloud API tiers, free hosting/no-code), current 2025–2026 sources. Prices and free-tier numbers change fast — treat specifics as approximate and re-verify before committing._

---

## TL;DR

There is **no "free and unlimited" LLM** — every approach just moves the cost somewhere. There are four real paths, and "free" means something different in each:

| Path | What "free" means | Truly $0? | Unlimited? | Quality | Effort |
|---|---|---|---|---|---|
| **1. In-browser** (WebLLM) | Runs on the *user's* device | **Yes** | **Yes** | Low–mid (1–3B models) | Low |
| **2. Free cloud API tiers** (rotation) | Free daily quotas, stacked | Yes, up to quotas | No — daily caps | **High** (Gemini/Groq) | Low |
| **3. Self-host** (Ollama/vLLM) | No per-token fee; you own compute | No — hardware + power | Yes (your hw limits) | Mid–high | **High** |
| **4. Near-free serverless** (per-token) | Sub-cent per message | No — pay-as-you-go | Yes | High | Low |

**For a student app on Vercel, paths 1 + 2 combined get you a genuinely free bot.** That's exactly what this project already does (path 2 = the AI Planner's provider rotation; path 1 = the new in-browser `/chat` bot).

---

## Path 1 — In-Browser Inference (the only truly $0 route)

Run a small quantized model **entirely in the visitor's browser tab** via **WebGPU**. Weights download once (cached locally), then all inference happens on the user's own GPU/CPU. Your server cost is $0 — you only host static JS + weight files (weights can even be served free from Hugging Face's CDN).

**Libraries:**
- **WebLLM** (`@mlc-ai/web-llm`, ~v0.2.84) — purpose-built for browser chat, WebGPU-accelerated, OpenAI-compatible API, Web Worker support, streaming. **The pragmatic default.** _(This is what the project's `/chat` page uses.)_
- **Transformers.js** (`@huggingface/transformers` v3.x) — general-purpose (also embeddings/vision/speech); WASM by default, WebGPU opt-in. Use if you need more than chat.
- **wllama** — llama.cpp in WASM, CPU-only; a fallback when WebGPU is absent.

**Best small models (WebLLM, 4-bit `q4f16`):**

| Model | Download (VRAM) | Notes |
|---|---|---|
| Qwen2.5-0.5B | ~0.9 GB | Strong for its tiny size |
| **Llama-3.2-1B** | **~0.9 GB** | Best broad-device default |
| Qwen2.5-1.5B | ~1.6 GB | Good quality/size balance |
| **gemma-2-2b-it** | ~1.9 GB | Strong 2B |
| **Llama-3.2-3B** | ~2.3 GB | Noticeably better chat |
| Phi-3.5-mini | ~3.7 GB | Capable but heavy |

**Performance:** WebGPU preserves up to ~85% of native speed on Apple Silicon. Roughly 50–90+ tok/s for 1B models, ~20–40 tok/s for 7–8B on a good GPU; much slower on integrated/low-end.

**Browser support (2025–26):** ~85% global. Chrome/Edge since v113 (2023). Safari 26 / iOS 26 (2025). Firefox 141 (Windows only so far). **Always feature-detect `navigator.gpu` and provide a fallback.**

**Pros:** $0 inference at any scale · privacy (data never leaves device) · offline after first load · no keys/limits/outages.
**Cons:** quality ceiling (1–3B ≪ frontier models) · large first download (bounce risk, painful on mobile data) · needs WebGPU + capable device · battery/thermal cost on mobile.

**Verdict:** Use when you want zero marginal cost, privacy is a plus, and the task suits a small model (simple Q&A, brainstorming, summarize, rewrite, offline assistant). Pair with a server/API fallback for weak devices and hard queries.

---

## Path 2 — Free Cloud API Tiers + Rotation (best quality-for-$0)

Stack the **free daily quotas** of several providers behind one interface, and **fail over** on rate-limit errors. This is the "effectively free forever" community pattern (see the `free-llm-api-resources` repo). Best quality per dollar because you're using real frontier-ish models (Gemini Flash, Llama 70B on Groq).

| Provider | Free tier | Notes |
|---|---|---|
| **Google Gemini** | Flash/Flash-Lite free (per-project RPM/RPD caps in AI Studio) | Best free "brand-name" quality; free data may train models |
| **Groq** | e.g. Llama 3.1 8B: 30 RPM / 14.4K req/day | **Fastest** (custom LPU hardware) |
| **OpenRouter** | `:free` models: 20 RPM / **50 req/day** → **1,000/day after a one-time $10 credit purchase** | One key, 300+ models; the $10 unlock is the big "cheat code" |
| **Cloudflare Workers AI** | **10,000 Neurons/day** free | Serverless, edge; catalog models only |
| **Cerebras** | $5 credits + rate-limited free (5 RPM, 1M tokens/day) | Extreme speed |
| **Hugging Face** | $0.10/mo free ($2 PRO) | Tiny — "try it," not "run free" |
| **Mistral** | $10/mo credit Free plan | Older unlimited-ish tier appears discontinued |

**Rotation strategy:** register keys across providers (independent quotas stack) → wrap behind one OpenAI-compatible interface → on `429`, rotate to next provider honoring `Retry-After` → route by task (Groq/Cerebras for speed, Gemini for quality, OpenRouter for overflow). Common glue: **LiteLLM**, or OpenRouter itself.

**Caveats:** OpenRouter caps free capacity globally (extra keys don't multiply it) · some free tiers train on your data (not for sensitive input) · numbers change often — rely on runtime 429 handling, not hardcoded limits.

**Verdict:** Best for hobby/MVP/low-volume bots where occasional rate-limit stalls are OK. Gemini Flash + Groq + a $10 OpenRouter unlock genuinely runs at $0 for modest traffic. _(This project already implements this exact pattern in `src/lib/aiPlanner.ts`.)_

---

## Path 3 — Self-Hosting Open Models (own everything, no vendor)

No per-token fee; you pay in **hardware + electricity** (owned) or **hourly rent** (cloud GPU).

**Serving tools:**
- **Ollama** / **LM Studio** — easiest, single-user, OpenAI-compatible. Great for prototyping.
- **llama.cpp** — the low-level engine both build on; GGUF, CPU+GPU.
- **vLLM** — **the one to put behind a real multi-user app** (high throughput, continuous batching, OpenAI + Anthropic-compatible). Ollama serializes under load; vLLM handles concurrency.
- **LocalAI**, **text-generation-webui** — other options.

**Hardware (4-bit quantized):**

| Model class | 4-bit VRAM | Runs on |
|---|---|---|
| 7–8B (Llama 3.1 8B, Qwen2.5 7B) | ~5–6 GB | RTX 3060 12GB, Mac 16GB |
| 13–14B | ~9–10 GB | RTX 4070, Mac 16–24GB |
| 27–34B | ~18–20 GB | RTX 3090/4090 24GB, Mac 32–48GB |
| 70B | ~40–48 GB | 2× 24GB GPUs, or **Mac Studio 64–128GB** (unified memory) |

**Cost — buy (one-time + power):** RTX 3060 12GB ~$280–330 · used RTX 3090 24GB ~$700–1,000 (best VRAM/$) · RTX 4090 24GB ~$1,800–2,400 · Mac Mini M4 from ~$599 · Mac Studio ~$2,000–5,600. Electricity ~$10–40/mo for a GPU rig 24/7 (Apple Silicon far less).

**Cost — rent (recurring, RunPod community rates, Aug 2026):** RTX 4090 ~$0.34/hr · A100 80GB ~$1.19/hr · H100 ~$1.99/hr. **A 4090 run 24/7 ≈ $245–500/mo** — a $2,000 owned rig breaks even in ~4–8 months. Rent wins only for bursty/occasional use (turn it off when idle); Vast.ai interruptible is cheapest.

**Connecting a home box to a cloud app:** **Cloudflare Tunnel** (outbound-only, no open ports, free — best default) or **Tailscale** (mesh VPN; Serve keeps it private). Then the cloud app calls the OpenAI-compatible endpoint with an auth token.

**Pros:** no per-token fees · full privacy · no rate limits · one-time cost amortizes.
**Cons:** high upfront cost · **you're the ops team** · **weak concurrency** on a single consumer GPU · home reliability (power/internet, no SLA).

**Verdict:** Buy when usage is steady/predictable and privacy matters. Rent for spiky/occasional or to try a big GPU. Serve real traffic with vLLM behind Cloudflare Tunnel/Tailscale. **Not** worth it for a low-traffic app that Vercel already hosts — the free-tier + in-browser combo is far less work.

---

## Path 4 — Near-Free Serverless (pay-per-token, sub-cent)

Providers host open models and charge only per token; **idle = $0**, no monthly minimum, near-zero maintenance.

- **DeepInfra** (cheapest): Llama 3.1 8B Turbo **$0.02/$0.04 per 1M tokens** → a typical chat turn ≈ **0.004¢**. Llama 3.3 70B $0.10/$0.32.
- **Together AI**: Llama 3 8B Lite $0.14/$0.14; Llama 3.3 70B $1.04/$1.04.
- **Fireworks**: $1 free signup credit, tiered by size.
- **Groq / Cerebras Developer**: pay-as-you-go, extremely fast.

At these rates **a few dollars covers tens of thousands of conversation turns.** OpenAI-compatible, so it drops into an existing provider list in ~10 lines.

**Verdict:** The pragmatic upgrade when free-tier limits start to bite. "Near-free" without the 429 roulette, and no infrastructure. Best privacy/availability guarantees of the cheap options.

---

## Free Hosting & No-Code (supporting cast)

**Can actually run a model for free:** Hugging Face **Spaces (ZeroGPU)** — the one real "run weights free" host (shared queue, up to 96GB VRAM per call) · **Cloudflare Workers AI** free tier · **Google Colab** (experiments only — bans web-service hosting).

**Free hosts that only *proxy* to an API (no GPU):** Vercel Hobby (60s function cap, non-commercial only), Cloudflare Pages/Workers (100k req/day — best free proxy), Render free (spins down after 15 min; free Postgres expires in 30 days), Railway (no real free tier now, $5 trial), GitHub Pages (static only).

**Free open-source chat UIs:** **Open WebUI** & **Jan** & **AnythingLLM** (can run local models via Ollama/llama.cpp) · **LibreChat** & **Chatbot UI** & **HF chat-ui** (proxy an endpoint).

**No-code builders (free tiers):** **Dify Community** (self-host free, agents/RAG — best OSS builder) · **Typebot** (200 chats/mo cloud, self-host free) · **Flowise** (self-host free, Apache-2.0) · **Botpress**/**Voiceflow** (small managed free credit; limits unverified).

**Cheapest real path of all:** a **Telegram/Slack webhook bot on Cloudflare Workers** calling Workers AI — all within free tiers, no cold starts, 100k req/day.

---

## Recommendation for Residence Hub

This project is a Next.js app on Vercel (no GPU) serving student RAs — low, bursty traffic. The winning combination is what's **already partly built**:

1. **Keep the free-tier rotation** (`aiPlanner.ts`, Path 2) as the high-quality default — Gemini Flash-Lite + OpenRouter + NVIDIA, capped by `aiLimits.ts`. Effectively $0 at this scale.
2. **Ship the in-browser `/chat` bot** (WebLLM, Path 1) as the truly-free, no-limit, private option with a graceful WebGPU fallback. _(Built on branch `feature/webllm-chat`.)_
3. **If free-tier limits ever bite**, add **one serverless provider** (DeepInfra, Path 4) to the rotation — sub-cent per turn, ~10 lines of code, no infrastructure.
4. **Skip self-hosting** (Path 3) unless provider-independence becomes a hard requirement — it's the most work and least reliable for an app Vercel already hosts.

---

## Source notes / uncertainties

- GPU street prices & per-model VRAM are community rules-of-thumb (approximate).
- Gemini no longer publishes fixed free RPM/RPD — check AI Studio per project.
- NVIDIA NIM free-credit counts, Mistral's old free tier, SambaNova/Botpress/Voiceflow free limits: **unverified** (pages blocked/gated) — confirm before relying on them.
- Free hosting tiers churn fast (Railway/Fly already changed) — re-verify any "free" claim.
- **Key sources:** github.com/mlc-ai/web-llm · huggingface.co/docs/transformers.js · caniuse.com/webgpu · docs.vllm.ai · github.com/ollama/ollama · runpod.io/pricing · developers.cloudflare.com/workers-ai · ai.google.dev/gemini-api · console.groq.com/docs · openrouter.ai/docs · deepinfra.com/pricing · huggingface.co/pricing · dify.ai/pricing.
