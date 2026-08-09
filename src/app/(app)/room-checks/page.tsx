"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Check, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PageHeader, SectionMarker } from "@/components/wayfinding/PageChrome";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface RoomCheck {
  room: string;
  resident: string;
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
  const { data: history, mutate } = useSWR("/api/room-checks", fetcher);
  // Pull the RA's own residents from the floor roster to build the check.
  const { data: residents } = useSWR("/api/residents", fetcher);
  const [activeCheck, setActiveCheck] = useState<CheckRound | null>(null);
  const [checkType, setCheckType] = useState<typeof checkTypes[number]>("Health & Safety");
  const allHistory = history || [];

  const myResidents = (Array.isArray(residents) ? residents : []).filter((r: any) => r.canEdit);

  const startCheck = () => {
    if (myResidents.length === 0) {
      toast.error("Add residents to your floor roster first");
      return;
    }
    // One room per resident, sorted by room, pulled live from the roster.
    const rooms: RoomCheck[] = [...myResidents]
      .sort((a: any, b: any) => a.room.localeCompare(b.room, undefined, { numeric: true }))
      .map((r: any) => ({ room: r.room, resident: r.name, status: "pending" as const }));
    setActiveCheck({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: checkType,
      rooms,
    });
  };

  const updateRoom = (room: string, status: RoomCheck["status"], notes?: string) => {
    if (!activeCheck) return;
    setActiveCheck({
      ...activeCheck,
      rooms: activeCheck.rooms.map(r =>
        r.room === room ? { ...r, status, ...(notes !== undefined && { notes }) } : r
      ),
    });
  };

  const finishCheck = async () => {
    if (!activeCheck) return;
    try {
      await fetch("/api/room-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeCheck.type, rooms: activeCheck.rooms }),
      });
      setActiveCheck(null);
      mutate();
      toast.success("Room check complete!");
    } catch {
      toast.error("Failed to save room check");
    }
  };

  const completedCount = activeCheck?.rooms.filter(r => r.status !== "pending").length || 0;
  const totalCount = activeCheck?.rooms.length || 0;
  const concerns = activeCheck?.rooms.filter(r => r.status === "concern") || [];

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
        subtitle="Health & safety inspections and wellness checks — a rounds checklist for your walk-through."
      />

      {!activeCheck ? (
        <>
          <div className="mb-12 rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-card p-6">
            <div className="flex items-baseline gap-3 mb-4">
              <span className="wayfinding text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">NEW ROUND</span>
              <h3 className="font-display text-xl">Start a room check</h3>
            </div>
            <div className="flex gap-2 flex-wrap mb-5">
              {checkTypes.map(type => (
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
              <SectionMarker code="✦" label="Recent checks" />
              <div>
                {allHistory.map((check: any) => {
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
                            {new Date(check.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
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
              <Button size="sm" onClick={finishCheck} disabled={completedCount === 0}>
                Finish Check
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
                {concerns.length} concern{concerns.length > 1 ? "s" : ""} flagged
              </p>
            </div>
          )}

          <div className="grid gap-px bg-black/[0.08] dark:bg-white/[0.08] rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] md:grid-cols-2">
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-base tabular-nums w-8">{room.room}</span>
                    <span className="text-sm text-muted-foreground">{room.resident}</span>
                  </div>
                  {room.status === "pending" ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateRoom(room.room, "pass")}
                        className="p-1.5 rounded-lg hover:bg-[hsl(var(--sage)/0.12)] text-muted-foreground hover:text-[hsl(var(--sage))] dark:hover:text-[hsl(var(--sage-soft))] transition-colors"
                        title="Pass"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => updateRoom(room.room, "concern")}
                        className="p-1.5 rounded-lg hover:bg-[hsl(var(--terracotta)/0.12)] text-muted-foreground hover:text-[hsl(var(--terracotta))] dark:hover:text-[hsl(var(--terracotta-soft))] transition-colors"
                        title="Concern"
                      >
                        <AlertCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => updateRoom(room.room, "absent")}
                        className="p-1.5 rounded-lg hover:bg-black/[0.06] dark:hover:bg-white/[0.06] text-muted-foreground transition-colors"
                        title="Not present"
                      >
                        <Clock className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Badge className={
                      room.status === "pass" ? "bg-[hsl(var(--sage)/0.15)] text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]" :
                      room.status === "concern" ? "bg-[hsl(var(--terracotta)/0.15)] text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]" :
                      "bg-black/[0.06] dark:bg-white/[0.06] text-muted-foreground"
                    }>
                      {room.status === "pass" ? "Pass" : room.status === "concern" ? "Concern" : "Absent"}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
