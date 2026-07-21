"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calendar, Clock, MapPin, User, Pencil, Trash2 } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const categoryColors: Record<string, string> = {
  COMMUNITY_BUILDING: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  WELLNESS: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  ACADEMIC_SUCCESS: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  DIVERSITY_INCLUSION: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  CAREER_DEVELOPMENT: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  SUSTAINABILITY: "bg-teal-500/15 text-teal-400 border-teal-500/20",
  LEADERSHIP: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  SOCIAL: "bg-pink-500/15 text-pink-400 border-pink-500/20",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-white/[0.06] text-muted-foreground",
  PENDING_APPROVAL: "bg-amber-500/15 text-amber-400",
  APPROVED: "bg-emerald-500/15 text-emerald-400",
  COMPLETED: "bg-blue-500/15 text-blue-400",
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

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: event, isLoading, mutate } = useSWR(`/api/events/${params.id}`, fetcher);
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
      date: d.toISOString().split("T")[0],
      startTime: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
      endTime: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
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
        <p className="text-muted-foreground">Loading event...</p>
      </div>
    );
  }

  if (!event || event.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground">Event not found</p>
        <Button variant="outline" onClick={() => router.push("/events")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/events")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
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
        <Card className="border-purple-500/20">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Title</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <textarea
                className="mt-1.5 flex min-h-[80px] w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date</label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Start Time</label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">End Time</label>
                <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Location</label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <select
                  className="mt-1.5 flex h-10 w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 outline-none"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <select
                  className="mt-1.5 flex h-10 w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 outline-none"
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
          </CardContent>
        </Card>
      ) : (
        <>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{event.title}</h1>
              <Badge className={statusColors[event.status] || ""}>
                {event.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <Badge className={categoryColors[event.category] || ""}>
              {event.category.replace(/_/g, " ")}
            </Badge>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Calendar className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium text-sm">{formatDate(event.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Clock className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="font-medium text-sm">{formatTime(event.startTime)} - {formatTime(event.endTime)}</p>
                  </div>
                </div>
                {event.location && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <MapPin className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="font-medium text-sm">{event.location}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <User className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Organizer</p>
                    <p className="font-medium text-sm">{event.organizer?.name || "Unknown"}</p>
                  </div>
                </div>
              </div>

              {event.hall && (
                <div>
                  <p className="text-sm text-muted-foreground">Hall</p>
                  <p className="font-medium">{event.hall.name}</p>
                </div>
              )}

              {event.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{event.description}</p>
                </div>
              )}

              {event.reflection && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-xs text-muted-foreground mb-1">Reflection</p>
                  <p className="text-sm">{event.reflection}</p>
                </div>
              )}

              {event.attendance && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/20">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <User className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Attendance</p>
                    <p className="font-medium text-sm text-emerald-400">{event.attendance} residents</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <EventReflection event={event} onUpdate={mutate} />
        </>
      )}
    </div>
  );
}

function EventReflection({ event, onUpdate }: { event: any; onUpdate: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [attendance, setAttendance] = useState(event.attendance?.toString() || "");
  const [reflection, setReflection] = useState(event.reflection || "");
  const [saving, setSaving] = useState(false);
  const params = useParams();

  if (event.status !== "COMPLETED" && event.status !== "APPROVED") return null;
  if (event.attendance && event.reflection) return null;

  const handleSave = async () => {
    setSaving(true);
    const d = new Date(event.date);
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);

    try {
      await fetch(`/api/events/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: event.title,
          description: event.description,
          date: d.toISOString().split("T")[0],
          startTime: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
          endTime: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
          location: event.location,
          category: event.category,
          status: event.status,
          attendance,
          reflection,
        }),
      });
      toast.success("Saved!");
      setShowForm(false);
      onUpdate();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-emerald-500/20 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
      <CardContent className="p-5">
        {!showForm ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Post-Event Reflection</p>
              <p className="text-xs text-muted-foreground mt-0.5">Record attendance and what went well</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              Add Reflection
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">How many residents attended?</label>
              <Input
                type="number"
                value={attendance}
                onChange={(e) => setAttendance(e.target.value)}
                placeholder="e.g. 25"
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Reflection — what went well? What would you change?</label>
              <textarea
                className="mt-1.5 flex min-h-[80px] w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all placeholder:text-muted-foreground"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="The event went great because..."
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Reflection"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
