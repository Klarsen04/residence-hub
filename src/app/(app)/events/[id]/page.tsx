"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calendar, Clock, MapPin, User, Pencil, Trash2 } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import { toast } from "sonner";
import { PageHeader, SectionMarker } from "@/components/wayfinding/PageChrome";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json();
};

// Format a Date as yyyy-mm-dd using local date parts (avoids UTC off-by-one in negative-UTC timezones).
const toLocalDateString = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "HH:MM" in local time — the shape the events API expects for start/end. */
const toHhMm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const categoryColors: Record<string, string> = {
  COMMUNITY_BUILDING: "bg-accent/15 text-accent border-accent/20",
  WELLNESS: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  ACADEMIC_SUCCESS: "bg-primary/15 text-primary border-primary/20",
  DIVERSITY_INCLUSION: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  CAREER_DEVELOPMENT: "bg-primary/15 text-primary border-primary/20",
  SUSTAINABILITY: "bg-teal-500/15 text-teal-400 border-teal-500/20",
  LEADERSHIP: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  SOCIAL: "bg-accent/15 text-accent border-accent/20",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-black/[0.06] dark:bg-white/[0.06] text-muted-foreground",
  PENDING_APPROVAL: "bg-amber-500/15 text-amber-400",
  APPROVED: "bg-emerald-500/15 text-emerald-400",
  COMPLETED: "bg-accent/15 text-accent",
  CANCELLED: "bg-red-500/15 text-red-400",
};

const categories = [
  { value: "COMMUNITY_BUILDING", label: "Community Building" },
  { value: "WELLNESS", label: "Wellness" },
  { value: "ACADEMIC_SUCCESS", label: "Academic Success" },
  { value: "DIVERSITY_INCLUSION", label: "Diversity & Inclusion" },
  { value: "CAREER_DEVELOPMENT", label: "Career Development" },
  { value: "SUSTAINABILITY", label: "Sustainability" },
  { value: "LEADERSHIP", label: "Leadership" },
  { value: "SOCIAL", label: "Social" },
];

const statuses = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_APPROVAL", label: "Pending Approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const labelClass = "wayfinding text-muted-foreground";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: event, isLoading, error, mutate } = useSWR(`/api/events/${params.id}`, fetcher);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);

  const startEdit = () => {
    const d = new Date(event.date);
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    setForm({
      title: event.title,
      description: event.description || "",
      date: toLocalDateString(d),
      startTime: toHhMm(start),
      endTime: toHhMm(end),
      location: event.location || "",
      category: event.category,
      status: event.status,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Event updated!");
      setEditing(false);
      mutate();
    } catch {
      toast.error("Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const res = await fetch(`/api/events/${params.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Event deleted!");
      router.push("/events");
    } catch {
      toast.error("Failed to delete event");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="wayfinding text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] animate-pulse">Reading the placard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="font-display text-2xl">Couldn&apos;t load this event.</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => mutate()}>Retry</Button>
          <Button variant="outline" onClick={() => router.push("/events")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  if (!event || event.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="font-display text-2xl">Event not found</p>
        <Button variant="outline" onClick={() => router.push("/events")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
      </div>
    );
  }

  const eventDate = new Date(event.date);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={() => router.push("/events")} className="-ml-2 gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Button>
        <div className="flex gap-2">
          {!editing && (
            <>
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {editing && form ? (
        <>
          <PageHeader code="01 · EDIT" title="Edit Event" subtitle="Update the listing — changes go straight to the board." />
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Title</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                className="mt-1.5 flex min-h-[80px] w-full rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Date</label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <label className={labelClass}>Start Time</label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <label className={labelClass}>End Time</label>
                <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Location</label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Category</label>
                <select
                  className="mt-1.5 flex h-10 w-full rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary/30 outline-none"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  className="mt-1.5 flex h-10 w-full rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary/30 outline-none"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {statuses.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ---- Placard: big editorial date + title ---- */}
          <div className="flex items-start gap-6 mb-2">
            <div className="text-center shrink-0">
              <p className="wayfinding text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">
                {eventDate.toLocaleDateString("en-US", { month: "short" })}
              </p>
              <p className="font-display text-6xl leading-none tabular-nums">{eventDate.getDate()}</p>
              <p className="wayfinding text-muted-foreground mt-1">
                {eventDate.toLocaleDateString("en-US", { weekday: "short" })}
              </p>
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <div className="wayfinding text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] mb-2 flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                01 · EVENT
              </div>
              <h1 className="font-display text-4xl leading-[1.05] tracking-tight">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge className={categoryColors[event.category] || ""}>
                  {event.category.replace(/_/g, " ")}
                </Badge>
                <Badge className={statusColors[event.status] || ""}>
                  {event.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-5 h-px w-full bg-black/[0.1] dark:bg-white/[0.1] mb-8" />

          {/* ---- Details as a hairline register ---- */}
          <SectionMarker code="i" label="Details" />
          <div className="rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-black/[0.08] dark:bg-white/[0.08]">
              <div className="flex items-center gap-3 px-5 py-4 bg-card">
                <Calendar className="h-4 w-4 text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] shrink-0" strokeWidth={1.75} />
                <div>
                  <p className={labelClass}>Date</p>
                  <p className="font-medium text-sm mt-0.5">{formatDate(event.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-4 bg-card">
                <Clock className="h-4 w-4 text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] shrink-0" strokeWidth={1.75} />
                <div>
                  <p className={labelClass}>Time</p>
                  <p className="font-medium text-sm mt-0.5">{formatTime(event.startTime)} - {formatTime(event.endTime)}</p>
                </div>
              </div>
              {event.location && (
                <div className="flex items-center gap-3 px-5 py-4 bg-card">
                  <MapPin className="h-4 w-4 text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))] shrink-0" strokeWidth={1.75} />
                  <div>
                    <p className={labelClass}>Location</p>
                    <p className="font-medium text-sm mt-0.5">{event.location}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 px-5 py-4 bg-card">
                <User className="h-4 w-4 text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))] shrink-0" strokeWidth={1.75} />
                <div>
                  <p className={labelClass}>Organizer</p>
                  <p className="font-medium text-sm mt-0.5">{event.organizer?.name || "Unknown"}</p>
                </div>
              </div>
            </div>
          </div>

          {event.hall && (
            <div className="mb-6">
              <p className={labelClass}>Hall</p>
              <p className="font-medium mt-1">{event.hall.name}</p>
            </div>
          )}

          {event.description && (
            <div className="mb-6">
              <SectionMarker code="ii" label="About" />
              <p className="text-sm leading-relaxed text-black/70 dark:text-white/70">{event.description}</p>
            </div>
          )}

          {event.reflection && (
            <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-card px-5 py-4 mb-6">
              <p className="wayfinding text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))] mb-1.5">Reflection</p>
              <p className="text-sm leading-relaxed text-black/70 dark:text-white/70">{event.reflection}</p>
            </div>
          )}

          {/* A turnout of zero is still a recorded turnout, so test against null. */}
          {event.attendance != null && (
            <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--sage)/0.3)] bg-[hsl(var(--sage)/0.06)] px-5 py-4 mb-6">
              <User className="h-4 w-4 text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))] shrink-0" strokeWidth={1.75} />
              <div>
                <p className={labelClass}>Attendance</p>
                <p className="font-display text-2xl leading-none mt-1 tabular-nums">{event.attendance} <span className="text-sm font-normal text-muted-foreground">residents</span></p>
              </div>
            </div>
          )}

          <EventReflection event={event} onUpdate={mutate} />
        </>
      )}
    </div>
  );
}

function EventReflection({ event, onUpdate }: { event: any; onUpdate: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [attendance, setAttendance] = useState("");
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const params = useParams();

  // Either half on its own counts as written up — a note with no head count is
  // still a reflection, and so is a head count with nothing said about it.
  const hasReflection = !!event.reflection || event.attendance != null;

  // An existing reflection stays reachable whatever the event's status becomes,
  // so it can always be corrected or taken down.
  if (event.status !== "COMPLETED" && event.status !== "APPROVED" && !hasReflection) return null;

  // Seeded when the form opens rather than at mount, so it always shows what's
  // saved right now — including straight after a save or a delete.
  const openForm = () => {
    setAttendance(event.attendance != null ? String(event.attendance) : "");
    setReflection(event.reflection || "");
    setSaveError(null);
    setShowForm(true);
  };

  /**
   * Writes just the reflection half of the event. The API rewrites date and
   * times on every PUT, so they're sent back unchanged from what's on screen.
   */
  const write = async (next: { attendance: string; reflection: string }, message: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: event.title,
          description: event.description,
          date: toLocalDateString(new Date(event.date)),
          startTime: toHhMm(new Date(event.startTime)),
          endTime: toHhMm(new Date(event.endTime)),
          location: event.location,
          category: event.category,
          status: event.status,
          ...next,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to save");
      }
      setSaveError(null);
      toast.success(message);
      setShowForm(false);
      onUpdate();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (!reflection.trim() && !attendance.trim()) {
      setSaveError("Write a reflection or record attendance before saving.");
      return;
    }
    write({ attendance, reflection }, hasReflection ? "Reflection updated" : "Reflection saved");
  };

  // Blanking both halves is the delete: the API stores empty as null, so the
  // write-up disappears and the panel offers to add one again.
  const handleDelete = () => {
    if (!confirm("Remove this reflection and its attendance count?")) return;
    write({ attendance: "", reflection: "" }, "Reflection removed");
  };

  return (
    <div className="rounded-xl border border-[hsl(var(--sage)/0.3)] bg-[hsl(var(--sage)/0.05)] px-5 py-5">
      {!showForm ? (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="wayfinding text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))] mb-1">Post-Event</p>
            <p className="font-display text-lg">Reflection</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasReflection ? "Written up above — change it or take it down." : "Record attendance and what went well"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={openForm}>
              {hasReflection ? <><Pencil className="h-3.5 w-3.5" /> Edit Reflection</> : "Add Reflection"}
            </Button>
            {hasReflection && (
              <Button
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={handleDelete}
                className="gap-1.5 text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] hover:bg-[hsl(var(--terracotta)/0.1)]"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="wayfinding text-muted-foreground">How many residents attended?</label>
            <Input
              type="number"
              value={attendance}
              onChange={(e) => setAttendance(e.target.value)}
              placeholder="e.g. 25"
              className="mt-1.5"
            />
          </div>
          <div>
            <label className="wayfinding text-muted-foreground">Reflection — what went well? What would you change?</label>
            <textarea
              className="mt-1.5 flex min-h-[80px] w-full rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all placeholder:text-muted-foreground"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="The event went great because..."
            />
          </div>
          {saveError && (
            <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : hasReflection ? "Save Changes" : "Save Reflection"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
