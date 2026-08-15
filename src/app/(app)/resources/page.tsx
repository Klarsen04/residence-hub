"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ExternalLink, BookOpen, Heart, Shield, GraduationCap, Users, Utensils, Pencil, Trash2, Check, Clock, Download } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PageHeader, SectionMarker, EmptyPlate } from "@/components/wayfinding/PageChrome";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json();
};

const resourceTypes = [
  "ALL", "CAMPUS_SERVICE", "MENTAL_HEALTH", "ACADEMIC_SUPPORT",
  "RESIDENCE_LIFE", "EMERGENCY", "DINING_REC", "FINANCIAL_WELLNESS",
  "EVENT_TEMPLATE", "TRAINING_MATERIAL", "SHARED",
];

const typeIcons: Record<string, any> = {
  CAMPUS_SERVICE: BookOpen,
  MENTAL_HEALTH: Heart,
  ACADEMIC_SUPPORT: GraduationCap,
  RESIDENCE_LIFE: Users,
  EMERGENCY: Shield,
  DINING_REC: Utensils,
  FINANCIAL_WELLNESS: BookOpen,
  EVENT_TEMPLATE: BookOpen,
  TRAINING_MATERIAL: BookOpen,
  SHARED: Users,
};

const NYIT_RESOURCES = [
  { title: "Counseling & Wellness", url: "https://www.nyit.edu/student-life/counseling-and-wellness/", type: "MENTAL_HEALTH", description: "Free, confidential counseling for all students" },
  { title: "Community Mental Health Resources", url: "https://www.nyit.edu/student-life/counseling-and-wellness/community-mental-health-resources/", type: "MENTAL_HEALTH", description: "Hotlines, referrals, and crisis resources" },
  { title: "Peer Health Educators", url: "https://www.nyit.edu/student-life/counseling-and-wellness/peer-health-educators/", type: "MENTAL_HEALTH", description: "Peer-led health education and wellness programs" },
  { title: "Suicide & Crisis Lifeline: 988", url: "tel:988", type: "EMERGENCY", description: "24/7 free crisis support — call or text 988" },
  { title: "Campus Security (LI): 516.686.7789", url: "tel:5166867789", type: "EMERGENCY", description: "Long Island campus security emergency line" },
  { title: "Campus Security (NYC): 646.273.7789", url: "tel:6462737789", type: "EMERGENCY", description: "NYC campus security emergency line" },
  { title: "Campus Safety", url: "https://www.nyit.edu/student-life/campus-safety/", type: "EMERGENCY", description: "Safety precautions, Tech Safe app, emergency procedures" },
  { title: "Tech Safe App", url: "https://www.nyit.edu/student-life/campus-safety/tech-safe/", type: "EMERGENCY", description: "Mobile safety app for campus emergencies" },
  { title: "Residence Life", url: "https://www.nyit.edu/student-life/residence-life/", type: "RESIDENCE_LIFE", description: "Main Residence Life page — policies, procedures, resources" },
  { title: "Residence Life Policies & Procedures", url: "https://www.nyit.edu/student-life/residence-life/policies-and-procedures/", type: "RESIDENCE_LIFE", description: "Official policies for residence halls" },
  { title: "What to Bring Checklist", url: "https://www.nyit.edu/student-life/residence-life/what-to-bring-checklist/", type: "RESIDENCE_LIFE", description: "Packing list for new residents" },
  { title: "Peer Success GUIDE Program", url: "https://www.nyit.edu/student-life/support/peer-success-guide-program/", type: "RESIDENCE_LIFE", description: "First-year mentoring and peer support program" },
  { title: "Student Activities & Organizations", url: "https://www.nyit.edu/student-life/activities-and-organizations/", type: "RESIDENCE_LIFE", description: "Clubs, orgs, and leadership opportunities" },
  { title: "Career Success & Experiential Education", url: "https://www.nyit.edu/academics/academic-success/career-success-and-experiential-education/", type: "CAMPUS_SERVICE", description: "Career counseling, internships, job placement" },
  { title: "Handshake (Jobs & Internships)", url: "https://www.nyit.edu/academics/academic-success/career-success-and-experiential-education/handshake/", type: "CAMPUS_SERVICE", description: "Job and internship platform for students" },
  { title: "Student Service Hub", url: "https://www.nyit.edu/students/student-service-hub/", type: "CAMPUS_SERVICE", description: "One-stop shop for student services" },
  { title: "Library", url: "https://www.nyit.edu/library", type: "CAMPUS_SERVICE", description: "Library resources, research help, and study spaces" },
  { title: "Accessibility Services", url: "https://www.nyit.edu/student-life/counseling-and-wellness/accessibility-services/", type: "CAMPUS_SERVICE", description: "Disability accommodations and support services" },
  { title: "Title IX & Gender-Based Misconduct", url: "https://www.nyit.edu/about/policies/title-ix-and-gender-based-misconduct/", type: "CAMPUS_SERVICE", description: "Reporting and support for gender-based issues" },
  { title: "Tutoring Services", url: "https://www.nyit.edu/academics/academic-success/tutoring/", type: "ACADEMIC_SUPPORT", description: "Free tutoring — Learning Center, Math, Writing" },
  { title: "Writing Center", url: "https://www.nyit.edu/academics/academic-success/tutoring/writing-center/", type: "ACADEMIC_SUPPORT", description: "Help with papers, essays, and writing assignments" },
  { title: "Math Resource Center", url: "https://www.nyit.edu/academics/academic-success/tutoring/math-resource-center/", type: "ACADEMIC_SUPPORT", description: "Drop-in math help and tutoring" },
  { title: "Academic Advising", url: "https://www.nyit.edu/academics/academic-success/advising/", type: "ACADEMIC_SUPPORT", description: "Course planning and academic guidance" },
  { title: "Supplemental Instruction", url: "https://www.nyit.edu/academics/academic-success/supplemental-instruction/", type: "ACADEMIC_SUPPORT", description: "Peer-led study sessions for tough courses" },
  { title: "Online Learning Resources", url: "https://www.nyit.edu/academics/academic-success/tutoring/online-learning-resources/", type: "ACADEMIC_SUPPORT", description: "Virtual tutoring and study tools" },
  { title: "Dining Services", url: "https://www.nyit.edu/student-life/dining/", type: "DINING_REC", description: "Dining locations, hours, and meal plans" },
  { title: "Meal Plans", url: "https://www.nyit.edu/student-life/dining/meal-plans/", type: "DINING_REC", description: "Residential and commuter meal plan options" },
  { title: "Catering", url: "https://www.nyit.edu/student-life/dining/catering/", type: "DINING_REC", description: "Catering for events and programs" },
  { title: "Bear Bytes: Food Pantry", url: "https://www.nyit.edu/student-life/support/bear-bytes/", type: "FINANCIAL_WELLNESS", description: "Free food pantry and meal assistance for students in need" },
  { title: "Student Emergency Fund", url: "https://www.nyit.edu/student-life/support/emergency-fund/", type: "FINANCIAL_WELLNESS", description: "Up to $500 for students facing financial emergencies" },
  { title: "Financial Success & Wellness", url: "https://www.nyit.edu/student-life/support/financial-success-and-wellness/", type: "FINANCIAL_WELLNESS", description: "Financial literacy and budgeting programs" },
  { title: "Student Freebies & Discounts", url: "https://www.nyit.edu/student-life/support/financial-success-and-wellness/student-freebies-and-discounts/", type: "FINANCIAL_WELLNESS", description: "Free software, subscriptions, and discounts for students" },
  { title: "Tech Threads", url: "https://www.nyit.edu/student-life/support/tech-threads/", type: "FINANCIAL_WELLNESS", description: "Free professional clothing for interviews and events" },
  { title: "First-Gen College Students", url: "https://www.nyit.edu/student-life/support/first-gen/", type: "CAMPUS_SERVICE", description: "Support and resources for first-generation students" },
  { title: "International Student Support", url: "https://www.nyit.edu/student-life/support/international-student-support/", type: "CAMPUS_SERVICE", description: "Immigration, cultural adjustment, and support services" },
  { title: "Student Veteran Hub", url: "https://www.nyit.edu/student-life/support/veteran-hub/", type: "CAMPUS_SERVICE", description: "Resources and community for student veterans" },
];

export default function ResourcesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", url: "", type: "SHARED" });
  const { data: sharedResources, error, mutate } = useSWR("/api/resources", fetcher);

  const [form, setForm] = useState({
    title: "",
    description: "",
    url: "",
    type: "SHARED",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          externalUrl: form.url,
          type: form.type,
          isPublic: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(isAdmin ? "Resource shared with the team!" : "Submitted — an admin will approve it shortly.");
      setShowForm(false);
      setForm({ title: "", description: "", url: "", type: "SHARED" });
      mutate();
    } catch {
      toast.error("Failed to share resource");
    }
  };

  const startEdit = (r: any) => {
    setEditingId(r.id);
    setEditForm({ title: r.title, description: r.description || "", url: r.url || "", type: r.type });
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch("/api/resources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title: editForm.title, description: editForm.description, externalUrl: editForm.url, type: editForm.type }),
      });
      if (!res.ok) throw new Error();
      setEditingId(null);
      await mutate();
      toast.success("Resource updated");
    } catch {
      toast.error("Failed to update resource");
    }
  };

  const deleteResource = async (id: string) => {
    if (!confirm("Delete this resource? This can't be undone.")) return;
    try {
      const res = await fetch(`/api/resources?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await mutate();
      toast.success("Resource deleted");
    } catch {
      toast.error("Failed to delete resource");
    }
  };

  const approveResource = async (id: string) => {
    try {
      const res = await fetch("/api/resources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, approved: true }),
      });
      if (!res.ok) throw new Error();
      await mutate();
      toast.success("Resource approved — now visible to everyone");
    } catch {
      toast.error("Failed to approve resource");
    }
  };

  // Admin-only: move the built-in campus resources into the DB so they become
  // editable. Idempotent — skips any whose title already exists.
  const importCampusResources = async () => {
    setImporting(true);
    const existing = new Set((sharedResources || []).map((r: any) => r.title));
    const toImport = NYIT_RESOURCES.filter((r) => !existing.has(r.title));
    let imported = 0;
    for (const r of toImport) {
      try {
        const res = await fetch("/api/resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: r.title, description: r.description, externalUrl: r.url, type: r.type, isPublic: true }),
        });
        if (res.ok) imported += 1;
      } catch {
        // Network failure for this item — counted as a failure below.
      }
    }
    await mutate();
    if (imported === toImport.length) {
      toast.success(`Imported ${imported} campus resource${imported === 1 ? "" : "s"} — now editable`);
    } else if (imported > 0) {
      toast.warning(`Imported ${imported} of ${toImport.length} campus resources — ${toImport.length - imported} failed`);
    } else {
      toast.error("Failed to import campus resources");
    }
    setImporting(false);
  };

  const dbResources = (sharedResources || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    url: r.externalUrl || r.fileUrl,
    type: r.type,
    isNYIT: false,
    approved: r.approved,
    canEdit: r.canEdit,
    canApprove: r.canApprove,
    sharedBy: r.user?.name,
  }));
  // Only show a hardcoded campus link if it hasn't been imported into the DB.
  const dbTitles = new Set(dbResources.map((r: any) => r.title));
  const allResources = [
    ...NYIT_RESOURCES.filter((r) => !dbTitles.has(r.title)).map((r) => ({ ...r, isNYIT: true, id: r.url, approved: true, canEdit: false, canApprove: false })),
    ...dbResources,
  ];

  const filtered = allResources.filter((r) => {
    if (filter !== "ALL") {
      if (filter === "SHARED" && r.isNYIT) return false;
      if (filter !== "SHARED" && r.type !== filter) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      return r.title.toLowerCase().includes(s) || r.description?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-7xl"
    >
      <PageHeader
        code="G · RESOURCES"
        title="Resources"
        subtitle="The front desk — NYIT services and materials the team has shared."
        action={
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={importCampusResources} disabled={importing} title="Copy the built-in campus links into the database so they can be edited">
                <Download className="h-4 w-4 mr-2" />
                {importing ? "Importing…" : "Import campus resources"}
              </Button>
            )}
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Share Resource
            </Button>
          </div>
        }
      />

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-card p-6">
            <div className="wayfinding text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] mb-5">
              Add to the desk
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="wayfinding text-muted-foreground">Title</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Resource name..."
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="wayfinding text-muted-foreground">URL</label>
                  <Input
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://..."
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <label className="wayfinding text-muted-foreground">Description</label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description..."
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="wayfinding text-muted-foreground">Category</label>
                <select
                  className="mt-1.5 flex h-10 w-full rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--terracotta)/0.3)] focus:border-[hsl(var(--terracotta)/0.4)] transition-all"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {resourceTypes.filter((t) => t !== "ALL").map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Share with Team</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      <SectionMarker
        code="✦"
        label="Directory"
        right={
          <div className="relative w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        }
      />

      <div className="flex gap-2 flex-wrap mb-8">
        {resourceTypes.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wide transition-all duration-200 ${
              filter === t
                ? "bg-[hsl(var(--terracotta)/0.14)] text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] border border-[hsl(var(--terracotta)/0.3)]"
                : "bg-black/[0.03] dark:bg-white/[0.04] text-muted-foreground border border-black/[0.08] dark:border-white/[0.08] hover:text-foreground"
            }`}
          >
            {t === "ALL" ? "All" : t.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-dashed border-black/[0.14] dark:border-white/[0.14] px-5 py-4">
          <div>
            <p className="text-sm font-medium">Couldn&apos;t load shared resources.</p>
            <p className="text-xs text-muted-foreground mt-0.5">{error.message} — showing built-in campus links only.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => mutate()}>
            Retry
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyPlate
          code="G · EMPTY"
          title="No resources found"
          hint="Try a different category, or share the first one with your team."
          icon={<BookOpen className="h-7 w-7" strokeWidth={1.5} />}
        />
      ) : (
        <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden divide-y divide-black/[0.07] dark:divide-white/[0.07]">
          {filtered.map((resource: any) => {
            const Icon = typeIcons[resource.type] || BookOpen;
            if (editingId === resource.id) {
              return (
                <div key={resource.id} className="bg-card px-5 py-4 space-y-2">
                  <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Title" />
                  <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" />
                  <Input value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} placeholder="URL" />
                  <select className="h-10 w-full rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-3 text-sm" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                    {resourceTypes.filter((t) => t !== "ALL").map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(resource.id)}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              );
            }
            return (
              <div key={resource.id} className="group flex items-start gap-4 px-5 py-4 bg-card hover:bg-[hsl(var(--sage)/0.06)] transition-colors">
                <div className="mt-0.5 shrink-0 text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h3 className="font-display text-lg leading-tight">{resource.title}</h3>
                    <span className="wayfinding text-muted-foreground">{resource.type.replace(/_/g, " ")}</span>
                    {resource.isNYIT && (
                      <span className="wayfinding text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">NYIT</span>
                    )}
                    {!resource.isNYIT && !resource.approved && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-500"><Clock className="h-3 w-3" /> Pending approval</span>
                    )}
                    {!resource.isNYIT && resource.sharedBy && (
                      <span className="text-[11px] text-muted-foreground">by {resource.sharedBy}</span>
                    )}
                  </div>
                  {resource.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{resource.description}</p>
                  )}
                </div>
                <div className="shrink-0 self-center flex items-center gap-2">
                  {resource.canApprove && !resource.approved && (
                    <button onClick={() => approveResource(resource.id)} className="inline-flex items-center gap-1 text-xs text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))] hover:opacity-80" title="Approve — make visible to everyone">
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                  )}
                  {resource.canEdit && (
                    <button onClick={() => startEdit(resource)} className="p-1.5 rounded-lg text-muted-foreground hover:text-[hsl(var(--terracotta))] hover:bg-[hsl(var(--terracotta)/0.1)] opacity-0 group-hover:opacity-100 transition-all" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {resource.canEdit && (
                    <button onClick={() => deleteResource(resource.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {resource.url && (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] hover:opacity-80 transition-opacity"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {resource.url.startsWith("tel:") ? "Call" : "Open"}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
