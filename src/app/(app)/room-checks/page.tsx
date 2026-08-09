"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Check, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

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

const generateRooms = (): RoomCheck[] => {
  const residents = [
    { room: "301", name: "Jordan Martinez" },
    { room: "302", name: "Priya Patel" },
    { room: "303", name: "Marcus Johnson" },
    { room: "304", name: "Sarah Kim" },
    { room: "305", name: "Alex Rivera" },
    { room: "306", name: "Taylor Chen" },
    { room: "307", name: "Chris O'Brien" },
    { room: "308", name: "Aisha Williams" },
    { room: "309", name: "Devon Park" },
    { room: "310", name: "Maya Thompson" },
    { room: "311", name: "Ryan Clark" },
    { room: "312", name: "Zoe Nguyen" },
  ];
  return residents.map(r => ({ room: r.room, resident: r.name, status: "pending" as const }));
};

const checkTypes = ["Health & Safety", "Wellness Check", "Break Closing"] as const;

export default function RoomChecksPage() {
  const { data: history, mutate } = useSWR("/api/room-checks", fetcher);
  const [activeCheck, setActiveCheck] = useState<CheckRound | null>(null);
  const [checkType, setCheckType] = useState<typeof checkTypes[number]>("Health & Safety");
  const allHistory = history || [];

  const startCheck = () => {
    setActiveCheck({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: checkType,
      rooms: generateRooms(),
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
      className="space-y-6 max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[hsl(var(--sage-soft))] to-emerald-500">
            <ClipboardCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Room Checks</h1>
            <p className="text-muted-foreground mt-0.5">Health & safety inspections and wellness checks</p>
          </div>
        </div>
      </div>

      {!activeCheck ? (
        <>
          <Card className="overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--sage-soft))]/[0.03] to-emerald-500/[0.03]" />
            <CardContent className="p-6 relative">
              <h3 className="font-semibold mb-3">Start a Room Check</h3>
              <div className="flex gap-2 flex-wrap mb-4">
                {checkTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setCheckType(type)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      checkType === type
                        ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                        : "bg-black/[0.04] dark:bg-white/[0.04] text-muted-foreground border border-black/[0.06] dark:border-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.08]"
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
            </CardContent>
          </Card>

          {allHistory.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Recent Checks</h3>
              {allHistory.map((check: any) => {
                const passCount = check.rooms.filter((r: any) => r.status === "pass").length;
                const concernCount = check.rooms.filter((r: any) => r.status === "concern").length;
                return (
                  <Card key={check.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-teal-500/10">
                          <CheckCircle2 className="h-4 w-4 text-teal-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{check.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(check.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/15 text-emerald-400">{passCount} pass</Badge>
                        {concernCount > 0 && <Badge className="bg-amber-500/15 text-amber-400">{concernCount} concern</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <Card className="border-teal-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold">{activeCheck.type} in Progress</p>
                  <p className="text-xs text-muted-foreground">{completedCount}/{totalCount} rooms checked</p>
                </div>
                <Button size="sm" onClick={finishCheck} disabled={completedCount === 0}>
                  Finish Check
                </Button>
              </div>
              <div className="h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--sage-soft))] to-emerald-500 transition-all duration-300"
                  style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {concerns.length > 0 && (
            <Card className="border-amber-500/20 bg-amber-500/[0.03]">
              <CardContent className="p-3">
                <p className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {concerns.length} concern{concerns.length > 1 ? "s" : ""} flagged
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-2 md:grid-cols-2">
            {activeCheck.rooms.map((room) => (
              <div
                key={room.room}
                className={`p-3 rounded-xl border transition-all ${
                  room.status === "pass" ? "border-emerald-500/20 bg-emerald-500/[0.03]" :
                  room.status === "concern" ? "border-amber-500/20 bg-amber-500/[0.03]" :
                  room.status === "absent" ? "border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] opacity-60" :
                  "border-black/[0.08] dark:border-white/[0.08] bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold w-8">{room.room}</span>
                    <span className="text-sm text-muted-foreground">{room.resident}</span>
                  </div>
                  {room.status === "pending" ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateRoom(room.room, "pass")}
                        className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 transition-all"
                        title="Pass"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => updateRoom(room.room, "concern")}
                        className="p-1.5 rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-400 transition-all"
                        title="Concern"
                      >
                        <AlertCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => updateRoom(room.room, "absent")}
                        className="p-1.5 rounded-lg hover:bg-black/[0.06] dark:hover:bg-white/[0.06] text-muted-foreground transition-all"
                        title="Not present"
                      >
                        <Clock className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Badge className={
                      room.status === "pass" ? "bg-emerald-500/15 text-emerald-400" :
                      room.status === "concern" ? "bg-amber-500/15 text-amber-400" :
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
