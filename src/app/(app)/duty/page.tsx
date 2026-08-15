"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { IlamyCalendar } from "@ilamy/calendar";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, SectionMarker } from "@/components/wayfinding/PageChrome";
import { TagPicker } from "@/components/TagPicker";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json();
};

const SHIFT_TYPES: Record<string, { label: string; startHour: number; endHour: number; color: string }> = {
  evening: { label: "Evening", startHour: 19, endHour: 23, color: "#3f6b52" },
  overnight: { label: "Overnight", startHour: 0, endHour: 8, color: "#c05f3c" },
  weekend: { label: "Weekend", startHour: 9, endHour: 21, color: "#d99a3e" },
};

const WEEKDAYS = [
  { i: 1, label: "Mon" }, { i: 2, label: "Tue" }, { i: 3, label: "Wed" },
  { i: 4, label: "Thu" }, { i: 5, label: "Fri" }, { i: 6, label: "Sat" }, { i: 0, label: "Sun" },
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const toDay = (date: any): string =>
  typeof date === "string" ? date.slice(0, 10)
  : date?.format ? date.format("YYYY-MM-DD")
  : date?.toISOString ? date.toISOString().slice(0, 10)
  : date?.toDate ? date.toDate().toISOString().slice(0, 10)
  : todayStr();

const raLabel = (u: any) => u.name || u.email || "Unnamed RA";

export default function DutyPage() {
  const { data: shifts, error: shiftsError, mutate } = useSWR("/api/duty", fetcher);
  const { data: team, error: teamError, mutate: mutateTeam } = useSWR("/api/team", fetcher);
  const loadError = shiftsError || teamError;

  // Which shift types are visible (filter toggles).
  const [visible, setVisible] = useState<Record<string, boolean>>({ evening: true, overnight: true, weekend: true });
  const [raFilter, setRaFilter] = useState("");

  // Create/edit panel state (one panel serves both).
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(todayStr());
  const [formType, setFormType] = useState("evening");
  const [formTitle, setFormTitle] = useState("");
  const [formRaId, setFormRaId] = useState("");
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [tagId, setTagId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const allShifts = useMemo(() => (Array.isArray(shifts) ? shifts : []), [shifts]);
  const ras = (Array.isArray(team) ? team : []).filter((u: any) => u.role === "RESIDENT_ASSISTANT" || u.role === "ADMIN");

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
          const label = s.title || s.tag?.name || cfg.label;
          // Ilamy uses `color` for the event TEXT and `backgroundColor` for the
          // fill — so they must differ or the title is invisible. Use the strong
          // colour for text on a translucent tint of the same colour.
          const isHex = /^#[0-9a-f]{6}$/i.test(color);
          return {
            id: s.id,
            title: `${label} · ${s.user?.name || "RA"}`,
            start: start.toISOString(),
            end: end.toISOString(),
            color,
            backgroundColor: isHex ? `${color}26` : color,
          };
        }),
    [allShifts, visible, raFilter]
  );

  const openCreate = (date: string) => {
    setEditingId(null);
    setFormDate(date);
    setFormType("evening");
    setFormTitle("");
    setFormRaId("");
    setRepeatDays([]);
    setTagId(null);
    setPanelOpen(true);
  };

  const openEdit = (shift: any) => {
    setEditingId(shift.id);
    setFormDate((shift.date || "").slice(0, 10));
    setFormType(shift.type || "evening");
    setFormTitle(shift.title || "");
    setFormRaId(shift.userId || "");
    setRepeatDays([]);
    setTagId(shift.tagId || null);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditingId(null);
  };

  const submit = async () => {
    if (!formDate || saving) return;
    setSaving(true);
    try {
      const res = editingId
        ? await fetch("/api/duty", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingId, date: formDate, type: formType, title: formTitle, tagId, raId: formRaId || undefined }),
          })
        : await fetch("/api/duty", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: formDate, type: formType, title: formTitle, tagId, recurrenceDays: repeatDays, weeks: 8, raId: formRaId || undefined }),
          });
      if (!res.ok) throw new Error();
      const data = await res.json().catch(() => ({}));
      closePanel();
      await mutate();
      toast.success(editingId ? "Shift updated" : data.created > 1 ? `Added ${data.created} shifts` : "Shift added");
    } catch {
      toast.error(editingId ? "Failed to update shift" : "Failed to add shift");
    } finally {
      setSaving(false);
    }
  };

  const deleteShift = async (id: string) => {
    if (!confirm("Remove this duty shift?")) return;
    try {
      const res = await fetch(`/api/duty?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      closePanel();
      await mutate();
      toast.success("Shift removed");
    } catch {
      toast.error("Failed to remove shift");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-6xl">
      <PageHeader
        code="G · DUTY"
        title="Duty Schedule"
        subtitle="Everyone's on-duty shifts. Add a shift, tag it, assign an RA, and filter the board."
        action={
          <Button onClick={() => openCreate(todayStr())}>
            <Plus className="h-4 w-4 mr-2" />
            New shift
          </Button>
        }
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

      {/* Create / edit panel */}
      {panelOpen && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 rounded-xl border border-black/[0.1] dark:border-white/[0.12] bg-card p-5 space-y-4">
          <SectionMarker code={editingId ? "✎" : "+"} label={editingId ? "Edit shift" : "Add shift"} />
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="wayfinding text-muted-foreground mb-2">Title</p>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Front desk, Rounds…" />
            </div>
            <div>
              <p className="wayfinding text-muted-foreground mb-2">Date</p>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>
          </div>
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
            <p className="wayfinding text-muted-foreground mb-2">Assigned RA</p>
            <select value={formRaId} onChange={(e) => setFormRaId(e.target.value)} className="h-10 w-full rounded-lg border border-black/[0.14] dark:border-white/[0.14] bg-transparent px-3 text-sm">
              <option value="">Me (default)</option>
              {ras.map((u: any) => <option key={u.id} value={u.id}>{raLabel(u)}</option>)}
            </select>
          </div>
          {!editingId && (
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
          )}
          <div>
            <p className="wayfinding text-muted-foreground mb-2">Tag</p>
            <TagPicker value={tagId} onChange={setTagId} />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={submit} disabled={saving} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
              {saving ? "Saving…" : editingId ? "Save changes" : `Add shift${repeatDays.length ? "s" : ""}`}
            </button>
            <button onClick={closePanel} className="h-10 px-5 rounded-lg text-sm text-muted-foreground">Cancel</button>
            {editingId && (
              <button onClick={() => deleteShift(editingId)} className="ml-auto inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-sm text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] hover:bg-[hsl(var(--terracotta)/0.1)]" title="Delete shift">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
          </div>
        </motion.div>
      )}

      {loadError ? (
        <div className="rounded-xl border border-dashed border-black/[0.14] dark:border-white/[0.14] py-14 px-6 text-center">
          <p className="font-display text-2xl">Couldn&apos;t load the duty schedule.</p>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto">{loadError.message}</p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={() => {
              mutate();
              mutateTeam();
            }}
          >
            Retry
          </Button>
        </div>
      ) : (
      <div className="ilamy-scope rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-card overflow-hidden">
        <div className="h-[70vh]">
          <IlamyCalendar
            events={events as any}
            initialView={"month" as any}
            firstDayOfWeek="monday"
            // Suppress Ilamy's built-in event form + drag-to-create; shifts are
            // created/edited only through our own panel (which persists to /api/duty).
            renderEventForm={() => null}
            disableDragAndDrop
            onCellClick={(cell: any) => openCreate(toDay(cell?.start ?? cell?.date ?? cell))}
            onEventClick={(ev: any) => {
              const shift = allShifts.find((s: any) => s.id === String(ev.id));
              if (shift) openEdit(shift);
            }}
          />
        </div>
      </div>
      )}
    </motion.div>
  );
}
