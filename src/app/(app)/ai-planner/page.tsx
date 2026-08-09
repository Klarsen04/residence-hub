"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Send, Trash2, Sparkles, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/wayfinding/PageChrome";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Msg { role: "user" | "assistant"; content: string; id?: string }
interface Convo { id: string; title: string; updatedAt: string }

// Minimal, safe Markdown → HTML (headings, bold, bullet/numbered lists, paragraphs).
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
  "Plan a $150 study break for 30 first-years during finals",
  "Low-cost community-building event for a quiet floor",
  "Wellness night ideas with a shopping list under $80",
  "Culturally inclusive event for Welcome Week",
];

export default function AIPlannerPage() {
  const { data: usage } = useSWR("/api/ai-planner", fetcher);
  const { data: conversations, mutate: mutateConvos } = useSWR<Convo[]>("/api/ai-planner/conversations", fetcher);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const convos = Array.isArray(conversations) ? conversations : [];

  // Auto-scroll to newest only if the user is already near the bottom, so
  // reading back through a long reply doesn't yank you down.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const openConversation = async (id: string) => {
    setActiveId(id);
    const data = await fetch(`/api/ai-planner/chat?id=${id}`).then((r) => r.json());
    setMessages(data.messages || []);
  };

  const newChat = () => { setActiveId(null); setMessages([]); setInput(""); };

  const deleteConvo = async (id: string) => {
    await fetch(`/api/ai-planner/conversations?id=${id}`, { method: "DELETE" });
    if (activeId === id) newChat();
    mutateConvos();
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content }]);
    setSending(true);
    try {
      const res = await fetch("/api/ai-planner/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, message: content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setActiveId(data.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      mutateConvos();
    } catch (e: any) {
      toast.error(e.message || "The assistant is busy — try again.");
      setMessages((m) => m.slice(0, -1)); // roll back the optimistic user msg
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      // Fill <main>'s content box exactly (h-full = 100% of the already-
      // padding-subtracted height), so the page never overflows <main> and only
      // the message thread scrolls. h-full is reliable here because <main> is a
      // flex-1 child of a min-h-screen row, giving it a definite height.
      className="max-w-6xl flex flex-col h-full min-h-0"
    >
      <div className="shrink-0">
        <PageHeader
          code="✦ · AI PLANNER"
          title="Planning Assistant"
          subtitle="Chat through event ideas, budgets, and timelines. Ask follow-ups — it remembers the conversation."
        />
      </div>

      <div className="grid md:grid-cols-[240px_1fr] grid-rows-1 gap-5 flex-1 min-h-0">
        {/* Conversation history */}
        <aside className="space-y-2 min-h-0 md:overflow-y-auto">
          <button onClick={newChat} className="w-full inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium">
            <Plus className="h-4 w-4" /> New chat
          </button>
          <div className="space-y-1">
            {convos.map((c) => (
              <div key={c.id} className={`group flex items-center gap-1 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${activeId === c.id ? "bg-black/[0.05] dark:bg-white/[0.06]" : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"}`} onClick={() => openConversation(c.id)}>
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{c.title}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteConvo(c.id); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {convos.length === 0 && <p className="text-xs text-muted-foreground px-3 py-2">No saved chats yet.</p>}
          </div>
        </aside>

        {/* Chat thread */}
        <div className="flex flex-col rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-card h-full min-h-0 overflow-hidden">
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-5">
            {messages.length === 0 && !sending ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <Sparkles className="h-8 w-8 text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] mb-3" />
                <p className="font-display text-2xl">What are we planning?</p>
                <p className="text-sm text-muted-foreground mt-1 mb-5">Describe an event, a budget, an audience — or start with one of these.</p>
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
                <div key={m.id || i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "user" ? (
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm">
                      {m.content}
                    </div>
                  ) : (
                    <div
                      className="max-w-[85%] rounded-2xl rounded-bl-sm bg-black/[0.03] dark:bg-white/[0.04] px-4 py-3 text-sm prose-plan"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                    />
                  )}
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-black/[0.03] dark:bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
                  <span className="inline-flex gap-1">
                    <span className="animate-pulse">Thinking</span>
                    <span className="animate-bounce">·</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-black/[0.08] dark:border-white/[0.08] p-3">
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Ask for an event idea, a budget breakdown, a timeline…"
                rows={1}
                className="flex-1 resize-none max-h-32 rounded-xl border border-black/[0.1] dark:border-white/[0.12] bg-transparent px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button type="submit" disabled={sending || !input.trim()} className="h-10 w-10 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </form>
            {usage && usage.limit != null && (
              <p className="text-[11px] text-muted-foreground mt-2 px-1">{usage.remaining} of {usage.limit} plans left today</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
