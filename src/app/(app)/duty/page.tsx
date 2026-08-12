"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { IlamyCalendar } from "@ilamy/calendar";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PageHeader, SectionMarker } from "@/components/wayfinding/PageChrome";
import { TagPicker } from "@/components/TagPicker";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const SHIFT_TYPES: Record<string, { label: string; startHour: number; endHour: number; color: string }> = {
  evening: { label: "Evening", startHour: 19, endHour: 23, color: "#3f6b52" },
  overnight: { label: "Overnight", startHour: 0, endHour: 8, color: "#c05f3c" },
  weekend: { label: "Weekend", startHour: 9, endHour: 21, color: "#d99a3e" },
};

const WEEKDAYS = [
  { i: 1, label: "Mon" }, { i: 2, label: "Tue" }, { i: 3, label: "Wed" },
  { i: 4, label: "Thu" }, { i: 5, label: "Fri" }, { i: 6, label: "Sat" }, { i: 0, label: "Sun" },
];

export default function DutyPage() {
  const { data: shifts, mutate } = useSWR("/api/duty", fetcher);

  // Which shift types are visible (filter toggles).
  const [visible, setVisible] = useState<Record<string, boolean>>({ evening: true, overnight: true, weekend: true });
  // Create panel state.
  const [panelDay, setPanelDay] = useState<string | null>(null);
  const [formType, setFormType] = useState("evening");
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [tagId, setTagId] = useState<string | null>(null);
  const [raFilter, setRaFilter] = useState("");

  const allShifts = Array.isArray(shifts) ? shifts : [];

  // RAs that have shifts on the board, for the RA filter dropdown.
  const raOptions = Array.from(
    allShifts.reduce((m: Map<string, string>, s: any) => (s.userId ? m.set(s.userId, s.user?.name || "RA") : m), new Map<string, string>())
  ).sort((a, b) => String(a[1]).localeCompare(String(b[1])));

  const events = useMemo(
    () =>
      allShifts
        .filter((s: any) => visible[s.type] !== false && (!raFilter || s.userId === raFilter))
        .map((s: any) => {
          const cfg = SHIFT_TYPES[s.type] || SHIFT_TYPES.evening;
          const color = s.tag?.color || cfg.color;
          const day = (s.date || "").slice(0, 10);
          const start = new Date(`${day}T${String(cfg.startHour).padStart(2, "0")}:00:00`);
          const end = new Date(`${day}T${String(cfg.endHour).padStart(2, "0")}:59:00`);
          return {
            id: s.id,
            title: `${s.user?.name || "RA"} · ${s.tag?.name || cfg.label}`,
            start: start.toISOString(),
            end: end.toISOString(),
            color,
            backgroundColor: color,
          };
        }),
    [allShifts, visible, raFilter]
  );

  const openPanel = (date: any) => {
    const day =
      typeof date === "string" ? date.slice(0, 10)
      : date?.toISOString ? date.toISOString().slice(0, 10)
      : date?.toDate ? date.toDate().toISOString().slice(0, 10)
      : null;
    if (!day) return;
    setPanelDay(day);
    setRepeatDays([]);
  };

  const submit = async () => {
    if (!panelDay) return;
    try {
      const res = await fetch("/api/duty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: panelDay, type: formType, tagId, recurrenceDays: repeatDays, weeks: 8 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      toast.success(data.created > 1 ? `Added ${data.created} shifts` : "Shift added");
      setPanelDay(null);
      setRepeatDays([]);
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-6xl">
      <PageHeader
        code="G · DUTY"
        title="Duty Schedule"
        subtitle="Everyone's on-duty shifts. Click a day to add yours — repeat across weekdays, tag it, and filter the board."
      />

      {/* Filter toggles — show/hide shift types on the board */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="wayfinding text-muted-foreground mr-1">Show</span>
        {Object.entries(SHIFT_TYPES).map(([key, cfg]) => {
          const on = visible[key] !== false;
          return (
            <button
              key={key}
              onClick={() => setVisible((v) => ({ ...v, [key]: !on }))}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all ${
                on ? "border-transparent text-white" : "border-black/[0.14] dark:border-white/[0.14] text-muted-foreground opacity-60"
              }`}
              style={on ? { background: cfg.color } : undefined}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: on ? "rgba(255,255,255,0.9)" : cfg.color }} />
              {cfg.label}
            </button>
          );
        })}
        {raOptions.length > 1 && (
          <select
            value={raFilter}
            onChange={(e) => setRaFilter(e.target.value)}
            className="ml-auto h-9 rounded-full border border-black/[0.14] dark:border-white/[0.14] bg-transparent px-3 text-sm"
            title="Filter by RA"
          >
            <option value="">All RAs</option>
            {raOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
      </div>

      {/* Create panel — opens when a day is clicked */}
      {panelDay && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 rounded-xl border border-black/[0.1] dark:border-white/[0.12] bg-card p-5 space-y-4">
          <SectionMarker code="+" label={`Add shift · ${panelDay}`} />
          <div>
            <p className="wayfinding text-muted-foreground mb-2">Shift type</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(SHIFT_TYPES).map(([key, cfg]) => (
                <button key={key} onClick={() => setFormType(key)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${formType === key ? "text-white" : "text-muted-foreground border border-black/[0.14] dark:border-white/[0.14]"}`} style={formType === key ? { background: cfg.color } : undefined}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="wayfinding text-muted-foreground mb-2">Repeat on (optional — next 8 weeks)</p>
            <div className="flex gap-1.5 flex-wrap">
              {WEEKDAYS.map((d) => {
                const on = repeatDays.includes(d.i);
                return (
                  <button key={d.i} onClick={() => setRepeatDays((r) => on ? r.filter((x) => x !== d.i) : [...r, d.i])} className={`h-9 w-11 rounded-lg text-sm transition-colors ${on ? "bg-primary text-primary-foreground" : "border border-black/[0.14] dark:border-white/[0.14] text-muted-foreground"}`}>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="wayfinding text-muted-foreground mb-2">Tag</p>
            <TagPicker value={tagId} onChange={setTagId} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={submit} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Add shift{repeatDays.length ? "s" : ""}</button>
            <button onClick={() => setPanelDay(null)} className="h-10 px-5 rounded-lg text-sm text-muted-foreground">Cancel</button>
          </div>
        </motion.div>
      )}

      <div className="ilamy-scope rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-card overflow-hidden">
        <div className="h-[70vh]">
          <IlamyCalendar
            events={events as any}
            initialView={"month" as any}
            firstDayOfWeek="monday"
            onCellClick={(cell: any) => openPanel(cell?.date ?? cell)}
            onEventClick={(ev: any) => {
              if (confirm(`Remove this duty shift?\n${ev.title}`)) deleteShift(String(ev.id));
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
