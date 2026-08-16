"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, Lock, ChevronDown, ChevronUp, Phone, ExternalLink, ShieldAlert, Pencil, Trash2, Clock, Check, Ban } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageHeader, SectionMarker, Plate, PlateRow, EmptyPlate } from "@/components/wayfinding/PageChrome";

interface Incident {
  id: string;
  date: string;
  time: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  location: string;
  description: string;
  actionTaken: string;
  followUpNeeded: boolean;
  status: "open" | "resolved" | "escalated";
  isPublic: boolean;
  /** Where a request to share with all RAs stands. Null means nothing pending. */
  shareRequest: "pending" | "rejected" | null;
  ownerId: string;
  ownerName: string;
  canEdit: boolean;
  /** True for admins — only they can approve or decline a sharing request. */
  canApprove: boolean;
  createdAt?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch incidents");
  return res.json();
});

const incidentTypes = [
  "Noise / Quiet Hours",
  "Guest / Visitation",
  "Prohibited Item",
  "Vandalism / Damage",
  "Roommate Conflict",
  "Alcohol / Drugs",
  "Student of Concern (Wellness)",
  "Mental Health Concern",
  "Sexual Misconduct / Title IX",
  "Bias-Related Conduct",
  "Maintenance Emergency",
  "Fire Safety",
  "Lockout / Key",
  "Other",
];

const severityConfig = {
  low: { color: "bg-accent/15 text-accent border-accent/20", label: "Low" },
  medium: { color: "bg-amber-500/15 text-amber-400 border-amber-500/20", label: "Medium" },
  high: { color: "bg-orange-500/15 text-orange-400 border-orange-500/20", label: "High" },
  critical: { color: "bg-red-500/15 text-red-400 border-red-500/20", label: "Critical" },
};

const statusConfig = {
  open: { color: "bg-amber-500/15 text-amber-400", label: "Open" },
  resolved: { color: "bg-emerald-500/15 text-emerald-400", label: "Resolved" },
  escalated: { color: "bg-red-500/15 text-red-400", label: "Escalated" },
};

const plainFetcher = (url: string) => fetch(url).then((r) => r.json());

export default function IncidentsPage() {
  const { data: incidents, error, isLoading, mutate } = useSWR<Incident[]>("/api/incidents", fetcher);
  // Admin-editable reference lists (reporting tracks + campus resources).
  const { data: cfg, mutate: mutateCfg } = useSWR("/api/incident-config", plainFetcher);
  const tracks: any[] = Array.isArray(cfg?.tracks) ? cfg.tracks : [];
  const resources: any[] = Array.isArray(cfg?.resources) ? cfg.resources : [];
  const canEditCfg = !!cfg?.canEdit;
  const [editTracks, setEditTracks] = useState(false);
  const [trackDraft, setTrackDraft] = useState<any[]>([]);
  const [editResources, setEditResources] = useState(false);
  const [resourceDraft, setResourceDraft] = useState<any[]>([]);
  const [savingCfg, setSavingCfg] = useState(false);

  const startEditTracks = () => { setTrackDraft(tracks.map((t) => ({ ...t }))); setEditTracks(true); };
  const startEditResources = () => { setResourceDraft(resources.map((r) => ({ ...r }))); setEditResources(true); };
  const saveCfg = async (payload: any, done: () => void, label: string) => {
    setSavingCfg(true);
    try {
      const res = await fetch("/api/incident-config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      await mutateCfg();
      done();
      toast.success(`${label} saved`);
    } catch { toast.error(`Failed to save ${label.toLowerCase()}`); }
    finally { setSavingCfg(false); }
  };

  const blankForm = () => ({
    date: new Date().toISOString().split("T")[0],
    time: "",
    type: incidentTypes[0],
    severity: "low" as Incident["severity"],
    location: "",
    description: "",
    actionTaken: "",
    followUpNeeded: false,
    isPublic: false,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm);

  // The report being edited, so the form can warn that a shared report goes back
  // for review when its wording changes.
  const editingIncident = editingId ? (incidents ?? []).find((i) => i.id === editingId) : null;

  const openNewForm = () => {
    setEditingId(null);
    setForm(blankForm());
    setShowForm(true);
  };

  const startEdit = (incident: Incident) => {
    setEditingId(incident.id);
    setForm({
      date: incident.date,
      time: incident.time,
      type: incident.type,
      severity: incident.severity,
      location: incident.location,
      description: incident.description,
      actionTaken: incident.actionTaken || "",
      followUpNeeded: incident.followUpNeeded,
      // Visibility is handled by its own request/approve buttons, not the form.
      isPublic: incident.isPublic,
    });
    setShowForm(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(blankForm());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim() || !form.location.trim()) {
      toast.error("Please fill in location and description");
      return;
    }
    setSaving(true);
    try {
      const wasShared = !!editingIncident?.isPublic;
      const res = await fetch("/api/incidents", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        // On an edit the id names the row; isPublic is deliberately not sent,
        // since visibility only moves through request/approve.
        body: JSON.stringify(editingId ? { ...form, id: editingId, isPublic: undefined } : form),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error);
      await mutate();
      const nowPending = editingId && wasShared && !body?.isPublic;
      closeForm();
      if (nowPending) {
        toast.success("Report updated — back to an admin for review before it's shared again");
      } else {
        toast.success(editingId ? "Report updated" : form.isPublic ? "Report saved — sharing sent to an admin for approval" : "Incident report saved");
      }
    } catch (err) {
      const fallback = editingId ? "Failed to update incident report" : "Failed to save incident report";
      toast.error(err instanceof Error && err.message ? err.message : fallback);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (incident: Incident, newStatus: "resolved" | "escalated") => {
    try {
      const res = await fetch("/api/incidents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: incident.id,
          status: newStatus,
          followUpNeeded: newStatus === "resolved" ? false : incident.followUpNeeded,
        }),
      });
      if (!res.ok) throw new Error("Failed to update incident");
      await mutate();
      toast.success(`Incident marked as ${newStatus}`);
    } catch {
      toast.error("Failed to update incident status");
    }
  };

  const deleteIncident = async (incident: Incident) => {
    if (!confirm("Delete this incident report? This can't be undone.")) return;
    try {
      const res = await fetch(`/api/incidents?id=${incident.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await mutate();
      toast.success("Incident report deleted");
    } catch {
      toast.error("Failed to delete incident report");
    }
  };

  /**
   * Moves a report's visibility. `requestPublic` is what the owner asks for;
   * only an admin's `approveShare` actually publishes anything.
   */
  const changeVisibility = async (
    incident: Incident,
    payload: { requestPublic?: boolean; approveShare?: boolean },
    message: string,
  ) => {
    try {
      const res = await fetch("/api/incidents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: incident.id, ...payload }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error);
      await mutate();
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Failed to change visibility");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground text-sm">Loading incidents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-red-400 mx-auto" />
          <p className="text-muted-foreground text-sm">Failed to load incidents. Please try again.</p>
          <Button variant="outline" onClick={() => mutate()}>Retry</Button>
        </div>
      </div>
    );
  }

  const incidentList = incidents ?? [];
  const openCount = incidentList.filter(i => i.status === "open").length;
  const followUpCount = incidentList.filter(i => i.followUpNeeded && i.status !== "resolved").length;
  // Admins get a queue count so a sharing request doesn't sit unnoticed. Read off
  // the rows themselves — the API already decides who may approve.
  const canApproveAny = incidentList.some(i => i.canApprove);
  const pendingShareCount = incidentList.filter(i => i.shareRequest === "pending").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto"
    >
      <PageHeader
        code="G · INCIDENTS"
        title="Front desk log"
        subtitle="Document and track floor incidents, and route each one to the right office."
        action={
          <Button onClick={() => (showForm ? closeForm() : openNewForm())}>
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
        }
      />

      {/* Emergency banner — every reporting flow leads with call-911 first */}
      <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-4 mb-10 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2 font-semibold text-red-500 dark:text-red-400">
          <ShieldAlert className="h-5 w-5" />
          Emergency? Call 911 first, then Campus Security.
        </div>
        <a href="tel:5166867789" className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
          <Phone className="h-3.5 w-3.5" /> LI 516.686.7789
        </a>
        <a href="tel:6462737789" className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
          <Phone className="h-3.5 w-3.5" /> NYC 646.273.7789
        </a>
      </div>

      <div className="mb-10">
        <PlateRow className={canApproveAny ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3"}>
          <Plate code="01" value={incidentList.length} label="Total reports" accent />
          <Plate code="02" value={openCount} label="Open" />
          <Plate code="03" value={followUpCount} label="Follow-up" />
          {canApproveAny && <Plate code="04" value={pendingShareCount} label="Sharing to review" />}
        </PlateRow>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-10">
            <Card className="border-red-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  {editingId ? "Edit Incident Report" : "New Incident Report"}
                  <Badge variant="secondary" className="ml-auto text-[10px]">Confidential</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Date</label>
                      <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1.5" required />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Time</label>
                      <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="mt-1.5" required />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Location</label>
                      <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Room/Floor/Area" className="mt-1.5" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Type</label>
                      <select
                        className="mt-1.5 flex h-10 w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.03] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                      >
                        {incidentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Severity</label>
                      <div className="flex gap-2 mt-1.5">
                        {(["low", "medium", "high", "critical"] as const).map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setForm({ ...form, severity: s })}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                              form.severity === s ? severityConfig[s].color : "border-black/[0.06] dark:border-white/[0.06] text-muted-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                            }`}
                          >
                            {severityConfig[s].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">What Happened</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Describe the incident objectively..."
                      className="mt-1.5 w-full min-h-[80px] rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.03] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Action Taken</label>
                    <textarea
                      value={form.actionTaken}
                      onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
                      placeholder="What did you do in response?"
                      className="mt-1.5 w-full min-h-[60px] rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.03] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.followUpNeeded}
                      onChange={(e) => setForm({ ...form, followUpNeeded: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-muted-foreground">Follow-up needed</span>
                  </label>

                  {editingId ? (
                    // Visibility isn't editable here — it moves through the
                    // request/approve buttons on the report itself.
                    editingIncident?.isPublic && !editingIncident?.canApprove ? (
                      <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3 text-xs text-muted-foreground">
                        <Clock className="h-4 w-4 shrink-0 text-amber-500" />
                        This report is shared with all RAs. Changing what it says sends it back to an admin for review, so the wording they approved isn&apos;t replaced without a second look.
                      </p>
                    ) : null
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isPublic}
                        onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm text-muted-foreground">Ask to share with all RAs — an admin approves it first</span>
                    </label>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving…" : editingId ? "Save Changes" : "Save Report"}
                    </Button>
                    <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reporting tracks — where different incident kinds actually route */}
      <div className="mb-10">
        <SectionMarker
          code="G.1"
          label="Reporting tracks"
          right={canEditCfg && !editTracks ? (
            <button onClick={startEditTracks} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-[hsl(var(--terracotta))]"><Pencil className="h-3.5 w-3.5" /> Edit</button>
          ) : undefined}
        />
        {editTracks ? (
          <div className="space-y-3">
            {trackDraft.map((t, i) => (
              <div key={i} className="rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-card p-3 space-y-2">
                <div className="flex gap-2">
                  <Input value={t.label || ""} onChange={(e) => setTrackDraft((d) => d.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder="Track label" className="h-8 text-sm" />
                  <Input value={t.routeTo || ""} onChange={(e) => setTrackDraft((d) => d.map((x, j) => j === i ? { ...x, routeTo: e.target.value } : x))} placeholder="Routes to (office)" className="h-8 text-sm" />
                  <button onClick={() => setTrackDraft((d) => d.filter((_, j) => j !== i))} className="p-1.5 text-muted-foreground hover:text-red-500" title="Remove"><Trash2 className="h-4 w-4" /></button>
                </div>
                <Input value={t.description || ""} onChange={(e) => setTrackDraft((d) => d.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="Description" className="h-8 text-xs" />
                <Input value={t.reportUrl || ""} onChange={(e) => setTrackDraft((d) => d.map((x, j) => j === i ? { ...x, reportUrl: e.target.value } : x))} placeholder="Official report URL (optional)" className="h-8 text-xs" />
              </div>
            ))}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setTrackDraft((d) => [...d, { key: `t${Date.now()}`, label: "", description: "", routeTo: "", reportUrl: "" }])}><Plus className="h-3.5 w-3.5 mr-1" /> Add track</Button>
              <Button size="sm" disabled={savingCfg} onClick={() => saveCfg({ tracks: trackDraft }, () => setEditTracks(false), "Reporting tracks")}>{savingCfg ? "Saving…" : "Save"}</Button>
              <Button size="sm" variant="outline" onClick={() => setEditTracks(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-px bg-black/[0.08] dark:bg-white/[0.08] rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] md:grid-cols-2">
            {tracks.map((track, i) => (
              <div key={track.key || i} className="bg-card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg leading-tight">{track.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{track.description}</p>
                  </div>
                  {track.reportUrl && (
                    <a href={track.reportUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] hover:opacity-70" title="Open official report form">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <p className="wayfinding text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))] mt-3">→ {track.routeTo}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Campus resources */}
      <div className="mb-10">
        <SectionMarker
          code="G.2"
          label="Campus resources"
          right={canEditCfg && !editResources ? (
            <button onClick={startEditResources} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-[hsl(var(--terracotta))]"><Pencil className="h-3.5 w-3.5" /> Edit</button>
          ) : undefined}
        />
        {editResources ? (
          <div className="space-y-3">
            {resourceDraft.map((r, i) => (
              <div key={i} className="rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-card p-3 space-y-2">
                <div className="flex gap-2">
                  <Input value={r.name || ""} onChange={(e) => setResourceDraft((d) => d.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Name" className="h-8 text-sm" />
                  <label className="flex items-center gap-1 text-xs text-muted-foreground shrink-0"><input type="checkbox" checked={!!r.emergency} onChange={(e) => setResourceDraft((d) => d.map((x, j) => j === i ? { ...x, emergency: e.target.checked } : x))} /> Emergency</label>
                  <button onClick={() => setResourceDraft((d) => d.filter((_, j) => j !== i))} className="p-1.5 text-muted-foreground hover:text-red-500" title="Remove"><Trash2 className="h-4 w-4" /></button>
                </div>
                <Input value={r.detail || ""} onChange={(e) => setResourceDraft((d) => d.map((x, j) => j === i ? { ...x, detail: e.target.value } : x))} placeholder="Detail" className="h-8 text-xs" />
                <div className="grid grid-cols-3 gap-2">
                  <Input value={r.phone || ""} onChange={(e) => setResourceDraft((d) => d.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} placeholder="Phone" className="h-8 text-xs" />
                  <Input value={r.email || ""} onChange={(e) => setResourceDraft((d) => d.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} placeholder="Email" className="h-8 text-xs" />
                  <Input value={r.url || ""} onChange={(e) => setResourceDraft((d) => d.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} placeholder="URL" className="h-8 text-xs" />
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setResourceDraft((d) => [...d, { name: "", detail: "", phone: "", email: "", url: "", emergency: false }])}><Plus className="h-3.5 w-3.5 mr-1" /> Add resource</Button>
              <Button size="sm" disabled={savingCfg} onClick={() => saveCfg({ resources: resourceDraft }, () => setEditResources(false), "Campus resources")}>{savingCfg ? "Saving…" : "Save"}</Button>
              <Button size="sm" variant="outline" onClick={() => setEditResources(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-px bg-black/[0.08] dark:bg-white/[0.08] rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] md:grid-cols-2">
            {resources.map((r, i) => (
              <div key={i} className={`p-4 ${r.emergency ? "bg-red-500/[0.05]" : "bg-card"}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">{r.name}</p>
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] hover:opacity-70 shrink-0">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{r.detail}</p>
                <div className="flex gap-4 mt-1.5">
                  {r.phone && <a href={`tel:${String(r.phone).replace(/\./g, "")}`} className="inline-flex items-center gap-1 text-xs font-medium hover:underline"><Phone className="h-3 w-3" /> {r.phone}</a>}
                  {r.email && <a href={`mailto:${r.email}`} className="text-xs font-medium text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] hover:underline truncate">{r.email}</a>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionMarker code="G.3" label="Logged incidents" />
        {incidentList.length === 0 ? (
          <EmptyPlate
            code="G.3 · EMPTY"
            title="No incidents logged yet"
            hint="File a report and it will appear here for tracking and follow-up."
            icon={<AlertTriangle className="h-7 w-7" strokeWidth={1.5} />}
          />
        ) : (
        <div className="space-y-3">
        {incidentList.map((incident) => {
          const isExpanded = expandedId === incident.id;
          return (
            <Card key={incident.id} className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : incident.id)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${incident.severity === "critical" || incident.severity === "high" ? "bg-red-500/10" : "bg-amber-500/10"}`}>
                      <AlertTriangle className={`h-4 w-4 ${incident.severity === "critical" || incident.severity === "high" ? "text-red-400" : "text-amber-400"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{incident.type}</h3>
                        {incident.followUpNeeded && incident.status !== "resolved" && (
                          <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(incident.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {incident.time} • {incident.location}
                        {!incident.canEdit && ` • by ${incident.ownerName}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {incident.isPublic && <Badge className="bg-primary/15 text-primary border-primary/20">Shared</Badge>}
                    {incident.shareRequest === "pending" && (
                      <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/20 gap-1">
                        <Clock className="h-3 w-3" /> Awaiting approval
                      </Badge>
                    )}
                    {incident.shareRequest === "rejected" && (
                      <Badge className="bg-black/[0.06] dark:bg-white/[0.08] text-muted-foreground gap-1">
                        <Ban className="h-3 w-3" /> Sharing declined
                      </Badge>
                    )}
                    <Badge className={severityConfig[incident.severity].color}>{severityConfig[incident.severity].label}</Badge>
                    <Badge className={statusConfig[incident.status].color}>{statusConfig[incident.status].label}</Badge>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.06] space-y-3"
                    >
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                        <p className="text-sm">{incident.description}</p>
                      </div>
                      {incident.actionTaken && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Action Taken</p>
                          <p className="text-sm">{incident.actionTaken}</p>
                        </div>
                      )}
                      {incident.canEdit ? (
                        <div className="flex gap-2 pt-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {(incident.status === "open" || incident.status === "escalated") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                              onClick={() => handleStatusChange(incident, "resolved")}
                            >
                              Mark Resolved
                            </Button>
                          )}
                          {incident.status === "open" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                              onClick={() => handleStatusChange(incident, "escalated")}
                            >
                              Escalate
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => startEdit(incident)}>
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>

                          {/* Visibility. An RA can only ask; the approve/decline
                              pair below shows for admins. */}
                          {incident.isPublic ? (
                            <Button size="sm" variant="outline" onClick={() => changeVisibility(incident, { requestPublic: false }, "Report set back to private")}>
                              Make private
                            </Button>
                          ) : incident.shareRequest === "pending" ? (
                            <Button size="sm" variant="outline" onClick={() => changeVisibility(incident, { requestPublic: false }, "Sharing request withdrawn")}>
                              Withdraw request
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => changeVisibility(incident, { requestPublic: true }, incident.canApprove ? "Report shared with all RAs" : "Sent to an admin for approval")}>
                              {incident.canApprove ? "Share with all RAs" : "Request sharing"}
                            </Button>
                          )}

                          {incident.canApprove && incident.shareRequest === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                                onClick={() => changeVisibility(incident, { approveShare: true }, `Approved — visible to all RAs`)}
                              >
                                <Check className="h-3.5 w-3.5" /> Approve sharing
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-muted-foreground"
                                onClick={() => changeVisibility(incident, { approveShare: false }, "Sharing declined — the report stays private")}
                              >
                                <Ban className="h-3.5 w-3.5" /> Decline
                              </Button>
                            </>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-auto gap-1.5 text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] hover:bg-[hsl(var(--terracotta)/0.1)]"
                            onClick={() => deleteIncident(incident)}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic pt-1">Shared by {incident.ownerName} — read-only</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          );
        })}
        </div>
        )}
      </div>
    </motion.div>
  );
}
