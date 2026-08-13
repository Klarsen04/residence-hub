"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Plus, User, Search, Pencil, Trash2, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PageHeader, SectionMarker, Plate, PlateRow, EmptyPlate } from "@/components/wayfinding/PageChrome";
import { formatDateTime } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Mood = "great" | "good" | "okay" | "struggling";

const topicOptions = [
  "Academics", "Homesickness", "Roommate", "Social Life",
  "Mental Health", "Career", "Financial", "Campus Involvement",
  "General Check-in", "Follow-up",
];

const moodConfig: Record<Mood, { label: string; color: string }> = {
  great: { label: "Great", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  good: { label: "Good", color: "bg-accent/15 text-accent border-accent/20" },
  okay: { label: "Okay", color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  struggling: { label: "Struggling", color: "bg-red-500/15 text-red-400 border-red-500/20" },
};

const parseTopics = (t: any): string[] => (t ? (typeof t === "string" ? JSON.parse(t) : t) : []);

const emptyForm = { residentId: "", residentName: "", room: "", mood: "good" as Mood, topics: [] as string[], notes: "", followUp: false };

export default function CheckInsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  // Active board context: "individual" (no board) or a board id.
  const [activeBoard, setActiveBoard] = useState<string>("individual");
  const { data: boards, mutate: mutateBoards } = useSWR("/api/check-in-boards", fetcher);
  const { data: checkIns, mutate } = useSWR(`/api/check-ins?boardId=${activeBoard}`, fetcher);
  const { data: residents } = useSWR("/api/residents", fetcher);

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [raFilter, setRaFilter] = useState("");
  const [wingFilter, setWingFilter] = useState("");
  const [form, setForm] = useState(emptyForm);

  // Board creation.
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newBoardScope, setNewBoardScope] = useState<"personal" | "shared">("personal");

  // Editing an existing check-in.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ mood: "good" as Mood, topics: [] as string[], notes: "", followUp: false });

  const allBoards = Array.isArray(boards) ? boards : [];
  const activeBoardObj = allBoards.find((b: any) => b.id === activeBoard);
  const scope: "shared" | "personal" | "individual" = activeBoardObj?.scope || "individual";

  const allCheckIns: any[] = Array.isArray(checkIns) ? checkIns : [];
  const allResidents = (Array.isArray(residents) ? residents : []).filter((r: any) => r.canEdit);
  const totalCheckIns = allCheckIns.length;

  // "Due" depends on the board type. Shared campaign: residents with no check-in
  // for this board yet. Personal / individual: not checked in today.
  const checkedResidentIds = new Set<string>();
  const checkedTodayIds = new Set<string>();
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  for (const ci of allCheckIns) {
    if (!ci.residentId) continue;
    checkedResidentIds.add(ci.residentId);
    if (new Date(ci.createdAt).getTime() >= startOfToday.getTime()) checkedTodayIds.add(ci.residentId);
  }
  const dueCount = allResidents.filter((r: any) =>
    scope === "shared" ? !checkedResidentIds.has(r.id) : !checkedTodayIds.has(r.id)
  ).length;

  // Filter options derived from the roster: by RA (owner) and by floor/wing.
  const wingKey = (r: any) => `${r.floor || ""}|${r.wing || ""}`;
  const wingLabel = (floor: string, wing: string) =>
    `${floor ? `Fl ${floor}` : "Unassigned"}${wing && wing !== "Main" ? ` · ${wing}` : wing === "Main" ? " · Main" : ""}`;
  const raOptions = Array.from(
    allResidents.reduce((m: Map<string, string>, r: any) => m.set(r.ownerId, r.ownerName), new Map<string, string>())
  ).sort((a, b) => a[1].localeCompare(b[1]));
  const wingOptions = Array.from(new Set(allResidents.map(wingKey))).filter((v) => v !== "|").sort();

  const filteredResidents = allResidents.filter((s: any) => {
    const q = search.toLowerCase();
    const matchesSearch = s.name.toLowerCase().includes(q) || (s.room || "").includes(search);
    const matchesRA = !raFilter || s.ownerId === raFilter;
    const matchesWing = !wingFilter || wingKey(s) === wingFilter;
    return matchesSearch && matchesRA && matchesWing;
  });

  const toggleTopic = (topic: string) => {
    setForm((f) => ({ ...f, topics: f.topics.includes(topic) ? f.topics.filter((t) => t !== topic) : [...f.topics, topic] }));
  };

  const selectResident = (resident: any) => {
    setForm({ ...form, residentId: resident.id, residentName: resident.name, room: resident.room || "" });
    setShowForm(true);
  };

  const chooseResident = (id: string) => {
    const r = allResidents.find((x: any) => x.id === id);
    setForm({ ...form, residentId: id, residentName: r?.name || "", room: r?.room || "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.residentId) {
      toast.error("Please select a resident");
      return;
    }
    try {
      const res = await fetch("/api/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, boardId: activeBoard === "individual" ? null : activeBoard }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to log check-in");
      }
      setShowForm(false);
      setForm(emptyForm);
      toast.success("Check-in logged!");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Failed to log check-in");
    }
  };

  const startEdit = (ci: any) => {
    setEditingId(ci.id);
    setEditForm({ mood: ci.mood, topics: parseTopics(ci.topics), notes: ci.notes || "", followUp: !!ci.followUp });
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch("/api/check-ins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editForm }),
      });
      if (!res.ok) throw new Error();
      setEditingId(null);
      await mutate();
      toast.success("Check-in updated");
    } catch {
      toast.error("Failed to update check-in");
    }
  };

  const deleteCheckIn = async (id: string) => {
    if (!confirm("Delete this check-in? This can't be undone.")) return;
    try {
      const res = await fetch(`/api/check-ins?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await mutate();
      toast.success("Check-in deleted");
    } catch {
      toast.error("Failed to delete check-in");
    }
  };

  const createBoard = async () => {
    if (!newBoardTitle.trim()) return;
    try {
      const res = await fetch("/api/check-in-boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newBoardTitle, scope: isAdmin ? newBoardScope : "personal" }),
      });
      if (!res.ok) throw new Error();
      const board = await res.json();
      setNewBoardTitle("");
      setNewBoardScope("personal");
      setShowBoardForm(false);
      await mutateBoards();
      setActiveBoard(board.id);
      toast.success(`Board "${board.title}" created`);
    } catch {
      toast.error("Failed to create board");
    }
  };

  const deleteBoard = async (id: string) => {
    if (!confirm("Delete this board? Its check-ins will be unlinked, not deleted.")) return;
    try {
      const res = await fetch(`/api/check-in-boards?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      if (activeBoard === id) setActiveBoard("individual");
      await mutateBoards();
      toast.success("Board deleted");
    } catch {
      toast.error("Failed to delete board");
    }
  };

  const chipClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
      active
        ? "bg-[hsl(var(--sage)/0.14)] text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))] border-[hsl(var(--sage)/0.35)]"
        : "bg-transparent text-muted-foreground border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
    }`;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-5xl">
      <PageHeader
        code="02·C · CHECK-INS"
        title="1:1 Check-Ins"
        subtitle="Private per-RA check-ins. Use a board for a campaign (e.g. Spring Check-in), or the running 1:1 log."
        action={
          <Button onClick={() => { setForm(emptyForm); setShowForm(!showForm); }}>
            <Plus className="h-4 w-4 mr-2" />
            Log Check-In
          </Button>
        }
      />

      {/* Board selector */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <button className={chipClass(activeBoard === "individual")} onClick={() => setActiveBoard("individual")}>
          Individual (1:1)
        </button>
        {allBoards.map((b: any) => (
          <span key={b.id} className="inline-flex items-center">
            <button className={chipClass(activeBoard === b.id)} onClick={() => setActiveBoard(b.id)}>
              {b.title}
              <span className="text-[10px] opacity-70">· {b.scope === "shared" ? "shared" : "private"}</span>
            </button>
            {b.canDelete && (
              <button onClick={() => deleteBoard(b.id)} className="ml-0.5 text-muted-foreground/50 hover:text-red-500" title="Delete board">
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {showBoardForm ? (
          <div className="inline-flex items-center gap-2">
            <Input value={newBoardTitle} onChange={(e) => setNewBoardTitle(e.target.value)} placeholder="Board name…" className="h-8 text-xs w-40" autoFocus onKeyDown={(e) => { if (e.key === "Enter") createBoard(); }} />
            {isAdmin && (
              <select value={newBoardScope} onChange={(e) => setNewBoardScope(e.target.value as any)} className="h-8 rounded-lg border border-black/[0.14] dark:border-white/[0.14] bg-transparent px-2 text-xs" title="Board visibility">
                <option value="personal">Private</option>
                <option value="shared">Shared (all RAs)</option>
              </select>
            )}
            <Button size="sm" className="h-8" onClick={createBoard}>Add</Button>
            <Button size="sm" variant="outline" className="h-8" onClick={() => setShowBoardForm(false)}>Cancel</Button>
          </div>
        ) : (
          <button onClick={() => setShowBoardForm(true)} className="px-3 py-1.5 rounded-full text-xs border border-dashed border-black/[0.2] dark:border-white/[0.2] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <Plus className="h-3 w-3" /> New board
          </button>
        )}
      </div>

      <PlateRow className="grid-cols-3 mb-10">
        <Plate code="01" value={totalCheckIns} label={scope === "shared" ? "Done this board" : "Check-ins here"} accent />
        <Plate code="02" value={dueCount} label={scope === "shared" ? "Remaining" : "Due today"} />
        <Plate code="03" value={allResidents.length} label="Residents" />
      </PlateRow>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-card">
            <div className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                {activeBoard !== "individual" && (
                  <p className="wayfinding text-muted-foreground">Logging into: <span className="text-foreground">{activeBoardObj?.title}</span></p>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Resident</label>
                    <select
                      value={form.residentId}
                      onChange={(e) => chooseResident(e.target.value)}
                      required
                      className="mt-1.5 flex h-10 w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.03] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    >
                      <option value="">Select a resident…</option>
                      {allResidents.map((r: any) => (
                        <option key={r.id} value={r.id}>{r.name}{r.room ? ` — Rm ${r.room}` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Room</label>
                    <Input value={form.room} readOnly placeholder="Auto-filled from roster" className="mt-1.5 bg-black/[0.03] dark:bg-white/[0.03]" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">How are they doing?</label>
                  <div className="flex gap-2">
                    {(Object.entries(moodConfig) as [Mood, typeof moodConfig.great][]).map(([key, config]) => (
                      <button key={key} type="button" onClick={() => setForm({ ...form, mood: key })}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${form.mood === key ? config.color : "border-black/[0.06] dark:border-white/[0.06] text-muted-foreground"}`}>
                        {config.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Topics Discussed</label>
                  <div className="flex flex-wrap gap-2">
                    {topicOptions.map((topic) => (
                      <button key={topic} type="button" onClick={() => toggleTopic(topic)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${form.topics.includes(topic) ? "bg-primary/20 text-primary border border-primary/30" : "bg-black/[0.04] dark:bg-white/[0.04] text-muted-foreground border border-black/[0.06] dark:border-white/[0.06]"}`}>
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notes (private)</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Key takeaways, concerns, follow-ups..."
                    className="mt-1.5 w-full min-h-[80px] rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.03] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground" />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.followUp} onChange={(e) => setForm({ ...form, followUp: e.target.checked })} className="rounded" />
                  <span className="text-sm text-muted-foreground">Follow-up needed</span>
                </label>

                <div className="flex gap-2">
                  <Button type="submit">Log Check-In</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      )}

      <div className="mb-12">
        <SectionMarker
          code="02·C"
          label="Your directory"
          right={
            <div className="flex items-center gap-2">
              {raOptions.length > 1 && (
                <select value={raFilter} onChange={(e) => setRaFilter(e.target.value)} title="Filter by RA" className="h-8 rounded-lg border border-black/[0.14] dark:border-white/[0.14] bg-transparent px-2 text-xs">
                  <option value="">All RAs</option>
                  {raOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              )}
              {wingOptions.length > 1 && (
                <select value={wingFilter} onChange={(e) => setWingFilter(e.target.value)} title="Filter by floor / wing" className="h-8 rounded-lg border border-black/[0.14] dark:border-white/[0.14] bg-transparent px-2 text-xs">
                  <option value="">All wings</option>
                  {wingOptions.map((w) => { const [floor, wing] = w.split("|"); return <option key={w} value={w}>{wingLabel(floor, wing)}</option>; })}
                </select>
              )}
              <div className="relative w-40">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="h-8 text-xs pl-8" />
              </div>
            </div>
          }
        />
        {filteredResidents.length === 0 ? (
          <EmptyPlate code="02·C · EMPTY" title="No residents to check in" hint="Add residents to your floor roster to start logging conversations." icon={<MessageCircle className="h-7 w-7" strokeWidth={1.5} />} />
        ) : (
          <div className="grid gap-px bg-black/[0.08] dark:bg-white/[0.08] rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] md:grid-cols-2">
            {filteredResidents.map((resident: any) => {
              const done = scope === "shared" ? checkedResidentIds.has(resident.id) : checkedTodayIds.has(resident.id);
              return (
                <div key={resident.id || resident.room} onClick={() => selectResident(resident)}
                  className="group flex items-center gap-3 bg-card p-4 cursor-pointer transition-colors hover:bg-[hsl(var(--sage)/0.06)]">
                  <div className="h-10 w-10 rounded-lg bg-black/[0.05] dark:bg-white/[0.06] flex items-center justify-center font-display text-base tabular-nums shrink-0">
                    {resident.room}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{resident.name}</p>
                    <p className="text-[11px] text-muted-foreground">{resident.year || "Resident"}{resident.major ? ` • ${resident.major}` : ""}</p>
                  </div>
                  {done && <Badge className="bg-[hsl(var(--sage)/0.15)] text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]">{scope === "shared" ? "Done" : "Today"}</Badge>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {allCheckIns.length > 0 && (
        <div>
          <SectionMarker code="✦" label="Recent check-ins" />
          <div>
            {allCheckIns.map((ci: any) => {
              const topics = parseTopics(ci.topics);
              const mood = ci.mood as Mood;
              if (editingId === ci.id) {
                return (
                  <div key={ci.id} className="py-4 rule first:border-t-0 space-y-3">
                    <p className="text-sm font-medium">{ci.residentName}{ci.room ? ` (Rm ${ci.room})` : ""}</p>
                    <div className="flex gap-2">
                      {(Object.entries(moodConfig) as [Mood, typeof moodConfig.great][]).map(([key, config]) => (
                        <button key={key} type="button" onClick={() => setEditForm({ ...editForm, mood: key })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${editForm.mood === key ? config.color : "border-black/[0.06] dark:border-white/[0.06] text-muted-foreground"}`}>
                          {config.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {topicOptions.map((topic) => (
                        <button key={topic} type="button" onClick={() => setEditForm((f) => ({ ...f, topics: f.topics.includes(topic) ? f.topics.filter((t) => t !== topic) : [...f.topics, topic] }))}
                          className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${editForm.topics.includes(topic) ? "bg-primary/20 text-primary border border-primary/30" : "bg-black/[0.04] dark:bg-white/[0.04] text-muted-foreground border border-black/[0.06] dark:border-white/[0.06]"}`}>
                          {topic}
                        </button>
                      ))}
                    </div>
                    <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Notes…"
                      className="w-full min-h-[60px] rounded-lg border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.03] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editForm.followUp} onChange={(e) => setEditForm({ ...editForm, followUp: e.target.checked })} className="rounded" />
                      <span className="text-xs text-muted-foreground">Follow-up needed</span>
                    </label>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(ci.id)}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={ci.id} className="group flex items-center gap-4 py-4 rule first:border-t-0">
                  <div className="p-2 rounded-lg bg-[hsl(var(--sage)/0.1)]">
                    <User className="h-4 w-4 text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ci.residentName}{ci.room ? ` (Rm ${ci.room})` : ""}</p>
                    <p className="wayfinding text-muted-foreground mt-0.5 normal-case">
                      {topics.length > 0 ? topics.join(", ") : "General"} • {formatDateTime(ci.createdAt)}
                    </p>
                  </div>
                  {moodConfig[mood] && <Badge className={moodConfig[mood].color}>{moodConfig[mood].label}</Badge>}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(ci)} className="p-1.5 rounded-lg text-muted-foreground hover:text-[hsl(var(--terracotta))] hover:bg-[hsl(var(--terracotta)/0.1)]" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => deleteCheckIn(ci.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
