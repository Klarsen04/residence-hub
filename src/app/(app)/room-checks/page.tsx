"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Check, AlertCircle, Pencil, Undo2, Plus, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PageHeader, SectionMarker, EmptyPlate } from "@/components/wayfinding/PageChrome";
import { formatDateTime } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const checkTypes = ["Health & Safety", "Wellness Check", "Break Closing"] as const;
type Status = "pass" | "fail";

interface RoomCheckBoard {
  id: string;
  title: string;
  type: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  myDoneCount: number;
  canDelete: boolean;
}

interface RoomCheckResult {
  id: string;
  boardId: string;
  residentId: string | null;
  residentName: string;
  room: string | null;
  status: Status;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  pass: "bg-[hsl(var(--sage)/0.15)] text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]",
  fail: "bg-[hsl(var(--terracotta)/0.15)] text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]",
  // legacy values still render if any old rows exist
  concern: "bg-[hsl(var(--terracotta)/0.15)] text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]",
  absent: "bg-black/[0.06] dark:bg-white/[0.06] text-muted-foreground",
};

export default function RoomChecksPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const { data: boards, mutate: mutateBoards } = useSWR<RoomCheckBoard[]>("/api/room-check-boards", fetcher);
  const { data: residents } = useSWR("/api/residents", fetcher);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const { data: results, mutate: mutateResults } = useSWR<RoomCheckResult[]>(
    activeBoardId ? `/api/room-check-boards/${activeBoardId}/results` : null,
    fetcher
  );

  // Admin: create a new board.
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newBoardType, setNewBoardType] = useState<(typeof checkTypes)[number]>("Health & Safety");

  // Filters for the "still to check" list (roster minus your saved results).
  const [poolRa, setPoolRa] = useState("");
  const [poolFloor, setPoolFloor] = useState("");
  const [poolWing, setPoolWing] = useState("");

  // The row you're currently marking: either { residentId } for a new mark, or
  // { resultId } to edit an existing one. Captures a status + concern notes.
  const [marking, setMarking] = useState<{ kind: "new" | "edit"; residentId?: string; residentName?: string; room?: string; resultId?: string; status: Status; notes: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const allBoards = Array.isArray(boards) ? boards : [];
  const activeBoard = allBoards.find((b) => b.id === activeBoardId) || null;
  const activeResults = Array.isArray(results) ? results : [];
  const manageable = (Array.isArray(residents) ? residents : []).filter((r: any) => r.canEdit);

  // Filter options from the roster.
  const raOptions = Array.from(
    manageable.reduce((m: Map<string, string>, r: any) => m.set(r.ownerId, r.ownerName), new Map<string, string>())
  ).sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  const floorOptions = Array.from(new Set(manageable.map((r: any) => r.floor).filter(Boolean))).sort();
  const wingOptions = Array.from(new Set(manageable.map((r: any) => r.wing).filter(Boolean))).sort();

  // "Still to check" = your manageable residents whose id isn't in your saved
  // results yet. Checked residents disappear from this list.
  const doneIds = new Set(activeResults.map((r) => r.residentId).filter(Boolean) as string[]);
  const pending = manageable.filter((r: any) =>
    !doneIds.has(r.id) &&
    (!poolRa || r.ownerId === poolRa) &&
    (!poolFloor || r.floor === poolFloor) &&
    (!poolWing || r.wing === poolWing)
  );

  const openMarkNew = (resident: any, status: Status) => {
    setMarking({ kind: "new", residentId: resident.id, residentName: resident.name, room: resident.room, status, notes: "" });
  };
  const openEdit = (result: RoomCheckResult) => {
    setMarking({ kind: "edit", resultId: result.id, residentId: result.residentId ?? undefined, residentName: result.residentName, room: result.room ?? undefined, status: result.status, notes: result.notes || "" });
  };
  const closeMarking = () => setMarking(null);

  const saveMarking = async () => {
    if (!activeBoardId || !marking || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/room-check-boards/${activeBoardId}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Editing targets the exact row; matching on residentId alone would
          // create a duplicate for a result that isn't linked to a resident.
          ...(marking.kind === "edit" && { resultId: marking.resultId }),
          residentId: marking.residentId,
          residentName: marking.residentName,
          room: marking.room,
          status: marking.status,
          notes: marking.notes,
        }),
      });
      if (!res.ok) throw new Error();
      closeMarking();
      await mutateResults();
      await mutateBoards();
      toast.success(marking.kind === "edit" ? "Result updated" : "Result saved");
    } catch {
      toast.error("Failed to save result");
    } finally {
      setSaving(false);
    }
  };

  const undoResult = async (result: RoomCheckResult) => {
    if (!activeBoardId) return;
    if (!confirm(`Undo the check for ${result.residentName}? They'll return to the pending list.`)) return;
    try {
      const res = await fetch(`/api/room-check-boards/${activeBoardId}/results?resultId=${result.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await mutateResults();
      await mutateBoards();
      toast.success("Reverted — resident is back on the pending list");
    } catch {
      toast.error("Failed to undo");
    }
  };

  const createBoard = async () => {
    if (!isAdmin || !newBoardTitle.trim()) return;
    try {
      const res = await fetch("/api/room-check-boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newBoardTitle, type: newBoardType }),
      });
      if (!res.ok) throw new Error();
      const board = await res.json();
      setShowNewBoard(false);
      setNewBoardTitle("");
      setNewBoardType("Health & Safety");
      await mutateBoards();
      setActiveBoardId(board.id);
      toast.success(`Board "${board.title}" created`);
    } catch {
      toast.error("Failed to create board");
    }
  };

  const deleteBoard = async (id: string) => {
    if (!confirm("Delete this board and all its results? This can't be undone.")) return;
    try {
      const res = await fetch(`/api/room-check-boards?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      if (activeBoardId === id) setActiveBoardId(null);
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-4xl mx-auto">
      <PageHeader
        code="G · ROOM CHECKS"
        title="Room Checks"
        subtitle={isAdmin
          ? "Create a board (e.g. Fall Health & Safety); every RA will check their own residents against it."
          : "Check your residents against the boards the admin has posted."}
        action={
          isAdmin ? (
            <Button onClick={() => setShowNewBoard(!showNewBoard)}>
              <Plus className="h-4 w-4 mr-2" />
              {showNewBoard ? "Cancel" : "New board"}
            </Button>
          ) : undefined
        }
      />

      {isAdmin && showNewBoard && (
        <div className="mb-8 rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-card p-5 space-y-3">
          <SectionMarker code="+" label="New room-check board" />
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={newBoardTitle} onChange={(e) => setNewBoardTitle(e.target.value)} placeholder="e.g. Fall Health & Safety" autoFocus />
            <select value={newBoardType} onChange={(e) => setNewBoardType(e.target.value as any)} className="h-10 rounded-lg border border-black/[0.14] dark:border-white/[0.14] bg-transparent px-3 text-sm">
              {checkTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={createBoard}>Create board</Button>
            <Button variant="outline" onClick={() => setShowNewBoard(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {allBoards.length === 0 ? (
        <EmptyPlate
          code="G · EMPTY"
          title={isAdmin ? "No boards yet" : "Nothing to check"}
          hint={isAdmin ? "Create a board and every RA will see it here." : "An admin hasn't posted a room-check board yet."}
          icon={<ClipboardCheck className="h-7 w-7" strokeWidth={1.5} />}
        />
      ) : (
        <>
          {/* Board selector */}
          <div className="flex flex-wrap gap-2 mb-6">
            {allBoards.map((b) => (
              <span key={b.id} className="inline-flex items-center">
                <button className={chipClass(activeBoardId === b.id)} onClick={() => setActiveBoardId(b.id)}>
                  {b.title}
                  <span className="text-[10px] opacity-70">· {b.type}</span>
                  {b.myDoneCount > 0 && <span className="ml-1 text-[10px] opacity-70">({b.myDoneCount})</span>}
                </button>
                {b.canDelete && (
                  <button onClick={() => deleteBoard(b.id)} className="ml-0.5 text-muted-foreground/50 hover:text-red-500" title="Delete board">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>

          {!activeBoard ? (
            <p className="wayfinding text-muted-foreground">Pick a board above to start.</p>
          ) : (
            <>
              {/* Progress + filters */}
              <div className="mb-6 rounded-xl border border-[hsl(var(--sage)/0.3)] bg-card p-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                  <div>
                    <p className="font-display text-lg">{activeBoard.title}</p>
                    <p className="wayfinding text-muted-foreground mt-0.5 normal-case">
                      {activeResults.length} checked · {pending.length} pending
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {raOptions.length > 1 && (
                      <select value={poolRa} onChange={(e) => setPoolRa(e.target.value)} className="h-9 rounded-lg border border-black/[0.14] dark:border-white/[0.14] bg-transparent px-2 text-xs" title="Filter by RA">
                        <option value="">All RAs</option>
                        {raOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                      </select>
                    )}
                    {floorOptions.length > 0 && (
                      <select value={poolFloor} onChange={(e) => setPoolFloor(e.target.value)} className="h-9 rounded-lg border border-black/[0.14] dark:border-white/[0.14] bg-transparent px-2 text-xs" title="Filter by floor">
                        <option value="">All floors</option>
                        {floorOptions.map((f: any) => <option key={f} value={f}>Floor {f}</option>)}
                      </select>
                    )}
                    {wingOptions.length > 0 && (
                      <select value={poolWing} onChange={(e) => setPoolWing(e.target.value)} className="h-9 rounded-lg border border-black/[0.14] dark:border-white/[0.14] bg-transparent px-2 text-xs" title="Filter by wing">
                        <option value="">All wings</option>
                        {wingOptions.map((w: any) => <option key={w} value={w}>{w === "Main" ? "Main" : `${w} Wing`}</option>)}
                      </select>
                    )}
                  </div>
                </div>
                <div className="h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-[hsl(var(--sage))] dark:bg-[hsl(var(--sage-soft))] transition-all duration-300"
                    style={{ width: `${activeResults.length + pending.length > 0 ? (activeResults.length / (activeResults.length + pending.length)) * 100 : 0}%` }} />
                </div>
              </div>

              {/* Marking panel (opens on Pass/Concern/Absent click or edit) */}
              {marking && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-xl border border-black/[0.12] dark:border-white/[0.14] bg-card p-4 space-y-3">
                  <p className="text-sm font-medium">
                    {marking.residentName}{marking.room ? ` — Rm ${marking.room}` : ""}
                  </p>
                  <div className="flex gap-2">
                    {(["pass", "fail"] as const).map((s) => (
                      <button key={s} onClick={() => setMarking({ ...marking, status: s })}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${marking.status === s ? statusColors[s] : "border-black/[0.06] dark:border-white/[0.06] text-muted-foreground"}`}>
                        {s === "pass" ? "Pass" : "Fail"}
                      </button>
                    ))}
                  </div>
                  <Input value={marking.notes} onChange={(e) => setMarking({ ...marking, notes: e.target.value })}
                    placeholder={marking.status === "fail" ? "Note — e.g. redo inspection needed (saved with this result)" : "Note (optional)"} className="h-9 text-sm" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveMarking} disabled={saving}>{saving ? "Saving…" : marking.kind === "edit" ? "Save changes" : "Save"}</Button>
                    <Button size="sm" variant="outline" onClick={closeMarking}>Cancel</Button>
                  </div>
                </motion.div>
              )}

              {/* Pending list — checked residents disappear from here */}
              <SectionMarker code="→" label="Still to check" right={<span className="wayfinding text-muted-foreground">{pending.length}</span>} />
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">All residents in this filter are checked. 🎉</p>
              ) : (
                <div className="grid gap-px bg-black/[0.08] dark:bg-white/[0.08] rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] md:grid-cols-2 mb-8">
                  {pending.map((r: any) => (
                    <div key={r.id} className="bg-card p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-display text-base tabular-nums w-10 shrink-0">{r.room}</span>
                        <span className="text-sm text-muted-foreground truncate">{r.name}</span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openMarkNew(r, "pass")} className="p-1.5 rounded-lg hover:bg-[hsl(var(--sage)/0.12)] text-muted-foreground hover:text-[hsl(var(--sage))] dark:hover:text-[hsl(var(--sage-soft))]" title="Pass"><Check className="h-4 w-4" /></button>
                        <button onClick={() => openMarkNew(r, "fail")} className="p-1.5 rounded-lg hover:bg-[hsl(var(--terracotta)/0.12)] text-muted-foreground hover:text-[hsl(var(--terracotta))] dark:hover:text-[hsl(var(--terracotta-soft))]" title="Fail"><AlertCircle className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Done list — edit / undo to fix mistakes */}
              {activeResults.length > 0 && (
                <>
                  <SectionMarker code="✓" label="Done" right={<span className="wayfinding text-muted-foreground">{activeResults.length}</span>} />
                  <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden divide-y divide-black/[0.07] dark:divide-white/[0.07]">
                    {activeResults.map((r) => (
                      <div key={r.id} className="group flex items-center gap-3 bg-card px-4 py-3">
                        <span className="font-display text-base tabular-nums w-10 shrink-0">{r.room}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{r.residentName}</p>
                          <p className="wayfinding text-muted-foreground mt-0.5 normal-case">
                            {formatDateTime(r.updatedAt || r.createdAt)}{r.notes ? ` · ${r.notes}` : ""}
                          </p>
                        </div>
                        <Badge className={statusColors[r.status]}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</Badge>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-muted-foreground hover:text-[hsl(var(--terracotta))] hover:bg-[hsl(var(--terracotta)/0.1)]" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => undoResult(r)} className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10" title="Undo / return to pending"><Undo2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </motion.div>
  );
}
