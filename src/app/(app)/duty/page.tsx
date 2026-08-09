"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { IlamyCalendar } from "@ilamy/calendar";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Shift types → time windows + a warm-palette colour for the calendar event.
const SHIFT_TYPES: Record<string, { label: string; startHour: number; endHour: number; color: string }> = {
  evening: { label: "Evening", startHour: 19, endHour: 23, color: "#3f6b52" },
  overnight: { label: "Overnight", startHour: 0, endHour: 8, color: "#c05f3c" },
  weekend: { label: "Weekend", startHour: 9, endHour: 21, color: "#d99a3e" },
};

function toISO(d: any): string {
  if (!d) return "";
  if (typeof d === "string") return d;
  if (typeof d?.toISOString === "function") return d.toISOString();
  if (typeof d?.toDate === "function") return d.toDate().toISOString();
  return String(d);
}

export default function DutyPage() {
  const { data: shifts, mutate } = useSWR("/api/duty", fetcher);
  const [newType, setNewType] = useState("evening");

  const allShifts = Array.isArray(shifts) ? shifts : [];

  // Map duty shifts → ilamy calendar events. `date` is a "YYYY-MM-DD" day.
  const events = useMemo(
    () =>
      allShifts.map((s: any) => {
        const cfg = SHIFT_TYPES[s.type] || SHIFT_TYPES.evening;
        const day = (s.date || "").slice(0, 10);
        const start = new Date(`${day}T${String(cfg.startHour).padStart(2, "0")}:00:00`);
        const end = new Date(`${day}T${String(cfg.endHour).padStart(2, "0")}:59:00`);
        return {
          id: s.id,
          title: `${s.user?.name || "RA"} · ${cfg.label}`,
          start: start.toISOString(),
          end: end.toISOString(),
          color: cfg.color,
          backgroundColor: cfg.color,
          data: { type: s.type, ra: s.user?.name },
        };
      }),
    [allShifts]
  );

  // Click an empty day → create a shift of the currently-selected type.
  const createShift = async (date: any) => {
    const day = toISO(date).slice(0, 10);
    if (!day) return;
    try {
      const res = await fetch("/api/duty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: day, type: newType }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${SHIFT_TYPES[newType].label} shift added for ${day}`);
      mutate();
    } catch {
      toast.error("Failed to add shift");
    }
  };

  const deleteShift = async (id: string) => {
    try {
      const res = await fetch(`/api/duty?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Shift removed");
      mutate();
    } catch {
      toast.error("Failed to remove shift");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5 max-w-6xl"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--sage-soft))]">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Duty Schedule</h1>
            <p className="text-muted-foreground mt-0.5">Everyone&apos;s on-duty shifts — click a day to add yours</p>
          </div>
        </div>

        {/* Shift-type picker: the kind of shift a day-click creates */}
        <div className="flex items-center gap-1.5 rounded-xl border border-black/[0.1] dark:border-white/[0.12] p-1">
          {Object.entries(SHIFT_TYPES).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setNewType(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                newType === key ? "text-white" : "text-muted-foreground hover:text-foreground"
              }`}
              style={newType === key ? { background: cfg.color } : undefined}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ilamy-scope rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-card overflow-hidden">
        <div className="h-[72vh]">
          <IlamyCalendar
            events={events as any}
            initialView={"month" as any}
            firstDayOfWeek="monday"
            onCellClick={(cell: any) => createShift(cell?.date ?? cell)}
            onEventClick={(ev: any) => {
              if (confirm(`Remove this duty shift?\n${ev.title}`)) deleteShift(String(ev.id));
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
