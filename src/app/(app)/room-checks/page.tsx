"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Check, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PageHeader, SectionMarker } from "@/components/wayfinding/PageChrome";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface RoomResident {
  name: string;
  email?: string | null;
}

interface RoomCheck {
  room: string;
  residents: RoomResident[];
  status: "pending" | "pass" | "concern" | "absent";
  notes?: string;
}

interface CheckRound {
  id: string;
  date: string;
  type: "Health & Safety" | "Wellness Check" | "Break Closing";
  rooms: RoomCheck[];
}

const checkTypes = ["Health & Safety", "Wellness Check", "Break Closing"] as const;

export default function RoomChecksPage() {
  const { data: session } = useSession();
  const { data: history, mutate } = useSWR("/api/room-checks", fetcher);
  // Pull the RA's own residents from the floor roster to build the check.
  const { data: residents } = useSWR("/api/residents", fetcher);
  const [activeCheck, setActiveCheck] = useState<CheckRound | null>(null);
  const [checkType, setCheckType] = useState<typeof checkTypes[number]>("Health & Safety");
  const [raFilter, setRaFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const allHistory = Array.isArray(history) ? history : [];

  // RAs that have logged rounds, for the filter dropdown.
  const raOptions = Array.from(
    allHistory.reduce((m: Map<string, string>, c: any) => m.set(c.ownerId, c.ownerName), new Map<string, string>())
  ).sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  const visibleHistory = raFilter ? allHistory.filter((c: any) => c.ownerId === raFilter) : allHistory;

  // Only YOUR assigned residents (your floor) — not everyone on the platform.
  const myResidents = (Array.isArray(residents) ? residents : []).filter(
    (r: any) => session?.user?.id && r.ownerId === session.user.id
  );

  const startCheck = () => {
    if (myResidents.length === 0) {
      toast.error("No residents assigned to you yet — add them to your floor roster first");
      return;
    }
    // Group residents by room so roommates (double/triple occupancy) are one
    // check that covers everyone in the room.
    const byRoom = new Map<string, RoomResident[]>();
    for (const r of myResidents as any[]) {
      const list = byRoom.get(r.room) || [];
      list.push({ name: r.name, email: r.email });
      byRoom.set(r.room, list);
    }
    const rooms: RoomCheck[] = [...byRoom.entries()]
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([room, residents]) => ({ room, residents, status: "pending" as const, notes: "" }));

    setActiveCheck({ id: Date.now().toString(), date: new Date().toISOString(), type: checkType, rooms });
  };

  const updateRoom = (room: string, patch: Partial<RoomCheck>) => {
    if (!activeCheck) return;
    setActiveCheck({
      ...activeCheck,
      rooms: activeCheck.rooms.map((r) => (r.room === room ? { ...r, ...patch } : r)),
    });
  };

  const finishCheck = async () => {
    if (!activeCheck || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/room-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeCheck.type, rooms: activeCheck.rooms }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setActiveCheck(null);
      await mutate();
      const emailed = data?.emailed || 0;
      toast.success(emailed > 0 ? `Room check saved — ${emailed} resident${emailed === 1 ? "" : "s"} notified` : "Room check saved");
    } catch {
      toast.error("Failed to save room check");
    } finally {
      setSaving(false);
    }
  };

  const completedCount = activeCheck?.rooms.filter((r) => r.status !== "pending").length || 0;
  const totalCount = activeCheck?.rooms.length || 0;
  const concerns = activeCheck?.rooms.filter((r) => r.status === "concern") || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto"
    >
      <PageHeader
        code="G · ROOM CHECKS"
        title="Room Checks"
        subtitle="Health & safety inspections and wellness checks — a rounds checklist for your floor, room by room."
      />

      {!activeCheck ? (
        <>
          <div className="mb-12 rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-card p-6">
            <div className="flex items-baseline gap-3 mb-4">
              <span className="wayfinding text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">NEW ROUND</span>
              <h3 className="font-display text-xl">Start a room check</h3>
            </div>
            <div className="flex gap-2 flex-wrap mb-5">
              {checkTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setCheckType(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    checkType === type
                      ? "bg-[hsl(var(--sage)/0.12)] text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))] border-[hsl(var(--sage)/0.35)]"
                      : "bg-transparent text-muted-foreground border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <Button onClick={startCheck}>
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Begin {checkType}
            </Button>
          </div>

          {allHistory.length > 0 && (
            <div>
              <SectionMarker
                code="✦"
                label="Recent checks"
                right={
                  raOptions.length > 1 ? (
                    <select
                      value={raFilter}
                      onChange={(e) => setRaFilter(e.target.value)}
                      className="h-9 rounded-lg border border-black/[0.14] dark:border-white/[0.14] bg-transparent px-3 text-sm"
                      title="Filter by RA"
                    >
                      <option value="">All RAs</option>
                      {raOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                  ) : undefined
                }
              />
              <div>
                {visibleHistory.map((check: any) => {
                  const passCount = check.rooms.filter((r: any) => r.status === "pass").length;
                  const concernCount = check.rooms.filter((r: any) => r.status === "concern").length;
                  return (
                    <div key={check.id} className="flex items-center justify-between gap-4 py-4 rule first:border-t-0">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[hsl(var(--sage)/0.1)]">
                          <CheckCircle2 className="h-4 w-4 text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]" strokeWidth={1.75} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{check.type}</p>
                          <p className="wayfinding text-muted-foreground mt-0.5 normal-case">
                            {check.ownerName} · {new Date(check.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-[hsl(var(--sage)/0.15)] text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]">{passCount} pass</Badge>
                        {concernCount > 0 && <Badge className="bg-[hsl(var(--terracotta)/0.15)] text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">{concernCount} concern</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-6 rounded-xl border border-[hsl(var(--sage)/0.3)] bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-display text-lg">{activeCheck.type} in progress</p>
                <p className="wayfinding text-muted-foreground mt-0.5 normal-case">{completedCount}/{totalCount} rooms checked</p>
              </div>
              <Button size="sm" onClick={finishCheck} disabled={completedCount === 0 || saving}>
                {saving ? "Saving…" : "Finish Check"}
              </Button>
            </div>
            <div className="h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-[hsl(var(--sage))] dark:bg-[hsl(var(--sage-soft))] transition-all duration-300"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          {concerns.length > 0 && (
            <div className="mb-6 rounded-xl border border-[hsl(var(--terracotta)/0.3)] bg-[hsl(var(--terracotta)/0.05)] p-3">
              <p className="text-xs font-medium text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                {concerns.length} concern{concerns.length > 1 ? "s" : ""} flagged — residents will be emailed on finish
              </p>
            </div>
          )}

          <div className="grid gap-px bg-black/[0.08] dark:bg-white/[0.08] rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08]">
            {activeCheck.rooms.map((room) => (
              <div
                key={room.room}
                className={`p-3 transition-colors ${
                  room.status === "pass" ? "bg-[hsl(var(--sage)/0.06)]" :
                  room.status === "concern" ? "bg-[hsl(var(--terracotta)/0.06)]" :
                  room.status === "absent" ? "bg-black/[0.02] dark:bg-white/[0.02] opacity-60" :
                  "bg-card"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-display text-base tabular-nums w-10 shrink-0">{room.room}</span>
                    <div className="min-w-0">
                      <span className="text-sm text-muted-foreground block truncate">
                        {room.residents.map((r) => r.name).join(", ")}
                      </span>
                      {room.residents.length > 1 && (
                        <span className="text-[10px] text-muted-foreground/70">{room.residents.length} residents</span>
                      )}
                    </div>
                  </div>
                  {room.status === "pending" ? (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => updateRoom(room.room, { status: "pass" })}
                        className="p-1.5 rounded-lg hover:bg-[hsl(var(--sage)/0.12)] text-muted-foreground hover:text-[hsl(var(--sage))] dark:hover:text-[hsl(var(--sage-soft))] transition-colors"
                        title="Pass"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => updateRoom(room.room, { status: "concern" })}
                        className="p-1.5 rounded-lg hover:bg-[hsl(var(--terracotta)/0.12)] text-muted-foreground hover:text-[hsl(var(--terracotta))] dark:hover:text-[hsl(var(--terracotta-soft))] transition-colors"
                        title="Concern (residents notified)"
                      >
                        <AlertCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => updateRoom(room.room, { status: "absent" })}
                        className="p-1.5 rounded-lg hover:bg-black/[0.06] dark:hover:bg-white/[0.06] text-muted-foreground transition-colors"
                        title="Not present"
                      >
                        <Clock className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => updateRoom(room.room, { status: "pending", notes: "" })}
                      title="Undo — set back to pending"
                    >
                      <Badge className={
                        room.status === "pass" ? "bg-[hsl(var(--sage)/0.15)] text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]" :
                        room.status === "concern" ? "bg-[hsl(var(--terracotta)/0.15)] text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]" :
                        "bg-black/[0.06] dark:bg-white/[0.06] text-muted-foreground"
                      }>
                        {room.status === "pass" ? "Pass" : room.status === "concern" ? "Concern" : "Absent"}
                      </Badge>
                    </button>
                  )}
                </div>
                {room.status === "concern" && (
                  <Input
                    value={room.notes || ""}
                    onChange={(e) => updateRoom(room.room, { notes: e.target.value })}
                    placeholder="What's the concern? (included in the resident's email)"
                    className="mt-2 h-8 text-xs"
                  />
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
