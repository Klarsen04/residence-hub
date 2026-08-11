"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Send, Bot, Download, Cpu, Zap, Trash2, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/wayfinding/PageChrome";
import { SYSTEM_PROMPT, modelsForEngine, type EngineKind, type LocalModel } from "@/lib/localai/models";
import { detectEngine, loadEngine, type LoadedEngine } from "@/lib/localai/engine";

interface Msg { role: "user" | "assistant"; content: string }

// Minimal, safe Markdown → HTML (headings, bold, bullet/numbered lists,
// paragraphs). Mirrors the AI Planner renderer so replies read the same.
function renderMarkdown(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
  const lines = md.split("\n");
  let html = "";
  let list: "ul" | "ol" | null = null;
  const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^#{1,6}\s/.test(line)) {
      closeList();
      const level = Math.min(line.match(/^#+/)![0].length, 4) + 1;
      html += `<h${level}>${inline(line.replace(/^#+\s/, ""))}</h${level}>`;
    } else if (/^\s*[-*]\s+/.test(line)) {
      if (list !== "ul") { closeList(); html += "<ul>"; list = "ul"; }
      html += `<li>${inline(line.replace(/^\s*[-*]\s+/, ""))}</li>`;
    } else if (/^\s*\d+\.\s+/.test(line)) {
      if (list !== "ol") { closeList(); html += "<ol>"; list = "ol"; }
      html += `<li>${inline(line.replace(/^\s*\d+\.\s+/, ""))}</li>`;
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return html;
}

const STARTERS = [
  "Give me 3 low-cost floor bonding ideas for a quiet floor",
  "Plan a study-break night for finals week under $80",
  "How do I handle a roommate conflict about noise?",
  "Inclusive Welcome Week event ideas with a supply list",
];

type Status = "detecting" | "idle" | "loading" | "ready";

export default function ChatPage() {
  const engineRef = useRef<LoadedEngine | null>(null);
  const [status, setStatus] = useState<Status>("detecting");
  const [engineKind, setEngineKind] = useState<EngineKind>("webllm");
  const [modelId, setModelId] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // On mount, detect which engine this browser can run and default the model.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const kind = await detectEngine();
      if (cancelled) return;
      const models = modelsForEngine(kind);
      setEngineKind(kind);
      setModelId(models[Math.min(1, models.length - 1)]?.id ?? models[0].id);
      setStatus("idle");
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-scroll to newest only when already near the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const models = modelsForEngine(engineKind);
  const activeModel: LocalModel | undefined = models.find((m) => m.id === modelId) ?? models[0];
  const isCpu = engineKind === "wllama";

  const load = async () => {
    if (status === "loading" || !activeModel) return;
    setStatus("loading");
    setProgress(0);
    setProgressText("Starting up…");
    try {
      engineRef.current = await loadEngine(activeModel, (pct, text) => {
        setProgress(pct);
        setProgressText(text);
      });
      setStatus("ready");
    } catch (e: any) {
      console.error(e);
      const msg = String(e?.message || e || "");
      if (/maxStorageBuffers|StorageBuffersPerShaderStage|exceeds limit/i.test(msg)) {
        toast.error("This browser's WebGPU limits are too low. Reload — it should switch to CPU mode.");
      } else {
        toast.error(`Couldn't load the model: ${msg.slice(0, 160) || "unknown error"}`);
      }
      setStatus("idle");
    }
  };

  const changeModel = (id: string) => {
    if (streaming) return;
    setModelId(id);
    engineRef.current = null;
    setStatus("idle");
    setProgress(0);
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || streaming || status !== "ready" || !engineRef.current) return;
    setInput("");
    const history: Msg[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      await engineRef.current.chat(
        [{ role: "system", content: SYSTEM_PROMPT }, ...history],
        (reply) => {
          setMessages((m) => {
            const next = [...m];
            next[next.length - 1] = { role: "assistant", content: reply };
            return next;
          });
        }
      );
      setMessages((m) => {
        const next = [...m];
        if (!next[next.length - 1].content.trim()) {
          next[next.length - 1] = { role: "assistant", content: "_(no response — try rephrasing)_" };
        }
        return next;
      });
    } catch (e: any) {
      console.error(e);
      toast.error("Generation failed. Try again.");
      setMessages((m) => m.slice(0, -1));
      setInput(content);
    } finally {
      setStreaming(false);
    }
  };

  const clearChat = () => { if (!streaming) setMessages([]); };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl"
    >
      <PageHeader
        code="✦ · LOCAL AI"
        title="Offline Assistant"
        subtitle="A private AI that runs entirely in your browser — no account, no cost, no limits. Nothing you type leaves your device."
        action={
          messages.length > 0 && status === "ready" ? (
            <button
              onClick={clearChat}
              disabled={streaming}
              className="inline-flex items-center gap-2 rounded-lg border border-black/[0.1] dark:border-white/[0.12] px-3 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          ) : undefined
        }
      />

      {/* --- Detecting engine --- */}
      {status === "detecting" && (
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-card p-8 text-center text-sm text-muted-foreground">
          Checking what your browser can run…
        </div>
      )}

      {/* --- Setup: pick a model & download it --- */}
      {(status === "idle" || status === "loading") && (
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              {isCpu ? <Cpu className="h-5 w-5 text-primary" /> : <Zap className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <p className="font-display text-xl leading-tight">Choose a model to run locally</p>
              <p className="text-sm text-muted-foreground">Downloads once, then it&apos;s cached for next time.</p>
            </div>
          </div>

          {/* Engine-mode banner so the tradeoff is explicit. */}
          <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${isCpu
            ? "border-[hsl(var(--warm-yellow))]/40 bg-[hsl(var(--warm-yellow))]/10"
            : "border-emerald-500/30 bg-emerald-500/5"}`}>
            {isCpu ? (
              <>
                <strong>CPU mode.</strong> Your browser (e.g. Firefox) doesn&apos;t support the GPU acceleration
                the larger models need, so we&apos;ll run a small model on the CPU. It works everywhere but is
                slower — pick the smallest model for the best experience.
              </>
            ) : (
              <>
                <strong>GPU mode.</strong> Your browser supports WebGPU, so models run fast on your graphics card.
              </>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-2 mb-6">
            {models.map((m) => {
              const selected = m.id === modelId;
              return (
                <button
                  key={m.id}
                  onClick={() => changeModel(m.id)}
                  disabled={status === "loading"}
                  className={`text-left rounded-xl border p-3 transition-colors disabled:opacity-50 ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-black/[0.1] dark:border-white/[0.12] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                  }`}
                >
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{m.size}</p>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{m.note}</p>
                </button>
              );
            })}
          </div>

          {status === "loading" ? (
            <div>
              <div className="h-2 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut", duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-mono truncate">
                {progress}% · {progressText}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                First load fetches {activeModel?.size}. Keep this tab open.
              </p>
            </div>
          ) : (
            <button
              onClick={load}
              disabled={!activeModel}
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium disabled:opacity-40"
            >
              <Download className="h-4 w-4" /> Load {activeModel?.label} ({activeModel?.size})
            </button>
          )}
        </div>
      )}

      {/* --- Chat --- */}
      {status === "ready" && activeModel && (
        <div className="flex flex-col rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-card h-[calc(100dvh-18rem)] min-h-[22rem]">
          <div className="flex items-center justify-between gap-2 border-b border-black/[0.08] dark:border-white/[0.08] px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-mono">
                {activeModel.label} · {isCpu ? "CPU" : "GPU"} · local
              </span>
            </div>
            <button
              onClick={() => changeModel(modelId)}
              disabled={streaming}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
              title="Switch model"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Switch model
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-5">
            {messages.length === 0 && !streaming ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <Bot className="h-8 w-8 text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] mb-3" />
                <p className="font-display text-2xl">Ask me anything</p>
                <p className="text-sm text-muted-foreground mt-1 mb-5">Running privately on your device. Try one of these:</p>
                <div className="grid sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {STARTERS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="text-left text-sm rounded-lg border border-black/[0.1] dark:border-white/[0.12] p-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "user" ? (
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm">
                      {m.content}
                    </div>
                  ) : m.content ? (
                    <div
                      className="max-w-[85%] rounded-2xl rounded-bl-sm bg-black/[0.03] dark:bg-white/[0.04] px-4 py-3 text-sm prose-plan"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                    />
                  ) : (
                    <div className="rounded-2xl rounded-bl-sm bg-black/[0.03] dark:bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
                      <span className="inline-flex gap-1">
                        <span className="animate-pulse">Thinking</span>
                        <span className="animate-bounce">·</span>
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-black/[0.08] dark:border-white/[0.08] p-3">
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Message the offline assistant…"
                rows={1}
                disabled={streaming}
                className="flex-1 resize-none max-h-32 rounded-xl border border-black/[0.1] dark:border-white/[0.12] bg-transparent px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
              />
              <button type="submit" disabled={streaming || !input.trim()} className="h-10 w-10 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </form>
            <p className="text-[11px] text-muted-foreground mt-2 px-1">
              Free & unlimited — runs on your device{isCpu ? " (CPU mode: slower)" : ""}. Small models can be wrong; double-check anything important.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
