"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, DoorOpen, LayoutGrid, Ruler, Trash2, Heart, CheckCircle, Users, DollarSign, ExternalLink, Pencil } from "lucide-react";
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

const types = [
  { value: "ALL", label: "All" },
  { value: "DOOR_DECORATION", label: "Door Decs" },
  { value: "BULLETIN_BOARD", label: "Bulletin Boards" },
  { value: "HALLWAY_DECORATION", label: "Hallway" },
];

const decorationCategories = [
  { value: "WELCOME_WEEK", label: "Welcome Week" },
  { value: "MIDTERMS", label: "Midterms" },
  { value: "FINALS", label: "Finals" },
  { value: "MENTAL_HEALTH", label: "Mental Health" },
  { value: "HOLIDAYS", label: "Holidays" },
  { value: "HERITAGE_MONTHS", label: "Heritage Months" },
  { value: "LEADERSHIP", label: "Leadership" },
  { value: "ACADEMIC_SUCCESS", label: "Academic Success" },
];

function getSuggestedCategory(): string {
  const month = new Date().getMonth();
  if (month === 7 || month === 8) return "WELCOME_WEEK";
  if (month === 9 || month === 10) return "MIDTERMS";
  if (month === 11) return "FINALS";
  if (month === 0) return "WELCOME_WEEK";
  if (month === 2 || month === 3) return "MIDTERMS";
  if (month === 4) return "FINALS";
  return "ALL";
}

export default function DecorationsPage() {
  const suggested = getSuggestedCategory();
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showMadeForm, setShowMadeForm] = useState<string | null>(null);
  const [madeData, setMadeData] = useState({ imageUrl: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { data: decorations, error, mutate } = useSWR("/api/decorations", fetcher);

  // User-defined custom category filters, persisted locally. Each is { value, label }.
  const [customCats, setCustomCats] = useState<{ value: string; label: string }[]>([]);
  const [addingFilter, setAddingFilter] = useState(false);
  const [newFilter, setNewFilter] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("rh-decor-categories");
      if (raw) setCustomCats(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  const allCategories = [...decorationCategories, ...customCats];
  const addCustomCategory = () => {
    const label = newFilter.trim();
    if (!label) return;
    const value = "CUSTOM_" + label.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    if (allCategories.some((c) => c.value === value)) { setNewFilter(""); setAddingFilter(false); return; }
    const next = [...customCats, { value, label }];
    setCustomCats(next);
    try { localStorage.setItem("rh-decor-categories", JSON.stringify(next)); } catch { /* ignore */ }
    setNewFilter("");
    setAddingFilter(false);
    setCategoryFilter(value);
  };
  const removeCustomCategory = (value: string) => {
    const next = customCats.filter((c) => c.value !== value);
    setCustomCats(next);
    try { localStorage.setItem("rh-decor-categories", JSON.stringify(next)); } catch { /* ignore */ }
    if (categoryFilter === value) setCategoryFilter("ALL");
  };

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "DOOR_DECORATION",
    category: suggested !== "ALL" ? suggested : "WELCOME_WEEK",
    imageUrl: "",
    sourceUrl: "",
    instructions: "",
    materials: [{ name: "", quantity: "", cost: "", url: "" }],
  });

  // Est. total cost is auto-derived from the sum of material costs.
  const materialsTotal = form.materials.reduce((sum, m) => sum + (parseFloat(m.cost) || 0), 0);

  const addMaterial = () => {
    setForm({ ...form, materials: [...form.materials, { name: "", quantity: "", cost: "", url: "" }] });
  };

  const updateMaterial = (index: number, field: string, value: string) => {
    const materials = [...form.materials];
    materials[index] = { ...materials[index], [field]: value };
    setForm({ ...form, materials });
  };

  const removeMaterial = (index: number) => {
    setForm({ ...form, materials: form.materials.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const materials = form.materials
        .filter((m) => m.name.trim())
        .map((m) => ({ name: m.name, quantity: m.quantity, cost: m.cost ? parseFloat(m.cost) : null, url: m.url || null }));

      const res = await fetch(editingId ? `/api/decorations/${editingId}` : "/api/decorations", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          type: form.type,
          category: form.category,
          imageUrl: form.imageUrl || null,
          fileUrl: form.sourceUrl || null,
          instructions: form.instructions || null,
          // Auto-calculated from the material costs above.
          costEstimate: materialsTotal > 0 ? materialsTotal : null,
          materials,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(editingId ? "Decoration updated!" : "Decoration added!");
      setShowForm(false);
      setEditingId(null);
      setForm({
        title: "", description: "", type: "DOOR_DECORATION", category: suggested !== "ALL" ? suggested : "WELCOME_WEEK",
        imageUrl: "", sourceUrl: "", instructions: "", materials: [{ name: "", quantity: "", cost: "", url: "" }],
      });
      mutate();
    } catch {
      toast.error(editingId ? "Failed to update decoration" : "Failed to add decoration");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (dec: any) => {
    setEditingId(dec.id);
    setForm({
      title: dec.title || "",
      description: dec.description || "",
      type: dec.type || "DOOR_DECORATION",
      category: dec.category || "WELCOME_WEEK",
      imageUrl: dec.imageUrl || "",
      sourceUrl: dec.fileUrl || "",
      instructions: dec.instructions || "",
      materials: dec.materials?.length
        ? dec.materials.map((m: any) => ({ name: m.name || "", quantity: m.quantity || "", cost: m.cost != null ? String(m.cost) : "", url: m.url || "" }))
        : [{ name: "", quantity: "", cost: "", url: "" }],
    });
    setShowForm(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFavorite = async (id: string) => {
    try {
      await fetch(`/api/decorations/${id}/favorite`, { method: "POST" });
      mutate();
    } catch {
      toast.error("Failed to update favorite");
    }
  };

  const handleMadeThis = async (id: string) => {
    try {
      const res = await fetch(`/api/decorations/${id}/made`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(madeData),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Nice! Marked as made.");
      setShowMadeForm(null);
      setMadeData({ imageUrl: "", notes: "" });
      mutate();
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this decoration?")) return;
    try {
      const res = await fetch(`/api/decorations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Deleted!");
      mutate();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const filtered = (decorations || []).filter((d: any) => {
    if (typeFilter !== "ALL" && d.type !== typeFilter) return false;
    if (categoryFilter !== "ALL" && d.category !== categoryFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return d.title.toLowerCase().includes(s) || d.description?.toLowerCase().includes(s);
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
        code="L3 · DECORATIONS"
        title="Decoration Hub"
        subtitle="A craft catalog — door decs, bulletin boards, and hallway ideas with materials and costs."
        action={
          <Button onClick={() => {
            if (!showForm) {
              setEditingId(null);
              setForm({ title: "", description: "", type: "DOOR_DECORATION", category: suggested !== "ALL" ? suggested : "WELCOME_WEEK", imageUrl: "", sourceUrl: "", instructions: "", materials: [{ name: "", quantity: "", cost: "", url: "" }] });
            }
            setShowForm(!showForm);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Decoration
          </Button>
        }
      />


      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-card p-6">
            <div className="wayfinding text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] mb-5">
              {editingId ? "Edit craft" : "New craft"}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="wayfinding text-muted-foreground">Title *</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Fall Leaf Door Decs, Growth Mindset Board..."
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="wayfinding text-muted-foreground">Photo URL</label>
                  <Input
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://... (paste image link)"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="wayfinding text-muted-foreground">Type *</label>
                  <select
                    className="mt-1.5 flex h-10 w-full rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--terracotta)/0.3)] focus:border-[hsl(var(--terracotta)/0.4)] transition-all"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {types.filter((t) => t.value !== "ALL").map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="wayfinding text-muted-foreground">Season/Theme *</label>
                  <select
                    className="mt-1.5 flex h-10 w-full rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--terracotta)/0.3)] focus:border-[hsl(var(--terracotta)/0.4)] transition-all"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {allCategories.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="wayfinding text-muted-foreground">Description</label>
                <textarea
                  className="mt-1.5 flex min-h-[80px] w-full rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--terracotta)/0.3)] focus:border-[hsl(var(--terracotta)/0.4)] transition-all"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description..."
                />
              </div>
              <div>
                <label className="wayfinding text-muted-foreground">Instructions</label>
                <textarea
                  className="mt-1.5 flex min-h-[80px] w-full rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--terracotta)/0.3)] focus:border-[hsl(var(--terracotta)/0.4)] transition-all"
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  placeholder="Step-by-step how to make it..."
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="wayfinding text-muted-foreground">Materials Needed</label>
                  <Button type="button" variant="outline" size="sm" onClick={addMaterial}>+ Add</Button>
                </div>
                <div className="space-y-2">
                  {form.materials.map((mat, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input value={mat.name} onChange={(e) => updateMaterial(i, "name", e.target.value)} placeholder="Material" className="flex-1" />
                      <Input value={mat.quantity} onChange={(e) => updateMaterial(i, "quantity", e.target.value)} placeholder="Qty" className="w-16" />
                      <Input value={mat.cost} onChange={(e) => updateMaterial(i, "cost", e.target.value)} placeholder="$" className="w-20" type="number" step="0.01" />
                      <Input value={mat.url} onChange={(e) => updateMaterial(i, "url", e.target.value)} placeholder="Where to buy (link)" className="flex-1" type="url" />
                      {form.materials.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(i)}><Trash2 className="h-4 w-4" /></Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="wayfinding text-muted-foreground">Source / Tutorial link</label>
                  <Input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://... (where this idea is from)" className="mt-1.5" type="url" />
                </div>
                <div>
                  <label className="wayfinding text-muted-foreground">Est. Total Cost (auto)</label>
                  <div className="mt-1.5 flex h-10 items-center rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 text-sm tabular-nums">
                    ${materialsTotal.toFixed(2)}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Summed from material costs.</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Save changes" : "Add Decoration"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      <SectionMarker
        code="✦"
        label="Catalog"
        right={
          <div className="relative w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search decorations..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
        }
      />

      <div className="flex gap-2 flex-wrap mb-3">
        {types.map((t) => (
          <button
            key={t.value}
            onClick={() => setTypeFilter(t.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wide transition-all duration-200 ${
              typeFilter === t.value
                ? "bg-[hsl(var(--terracotta)/0.14)] text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] border border-[hsl(var(--terracotta)/0.3)]"
                : "bg-black/[0.03] dark:bg-white/[0.04] text-muted-foreground border border-black/[0.08] dark:border-white/[0.08] hover:text-foreground"
            }`}
          >{t.label}</button>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap mb-8">
        <button
          onClick={() => setCategoryFilter("ALL")}
          className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wide transition-all duration-200 ${
            categoryFilter === "ALL"
              ? "bg-[hsl(var(--sage)/0.14)] text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))] border border-[hsl(var(--sage)/0.3)]"
              : "bg-black/[0.03] dark:bg-white/[0.04] text-muted-foreground border border-black/[0.08] dark:border-white/[0.08] hover:text-foreground"
          }`}
        >All Seasons</button>
        {allCategories.map((c) => {
          const isCustom = c.value.startsWith("CUSTOM_");
          return (
            <span key={c.value} className="inline-flex items-center">
              <button
                onClick={() => setCategoryFilter(c.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wide transition-all duration-200 ${
                  categoryFilter === c.value
                    ? "bg-[hsl(var(--sage)/0.14)] text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))] border border-[hsl(var(--sage)/0.3)]"
                    : "bg-black/[0.03] dark:bg-white/[0.04] text-muted-foreground border border-black/[0.08] dark:border-white/[0.08] hover:text-foreground"
                }`}
              >{c.label}</button>
              {isCustom && (
                <button onClick={() => removeCustomCategory(c.value)} className="ml-0.5 text-muted-foreground/50 hover:text-red-500" title="Remove filter">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </span>
          );
        })}
        {addingFilter ? (
          <input
            autoFocus
            value={newFilter}
            onChange={(e) => setNewFilter(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addCustomCategory(); if (e.key === "Escape") { setAddingFilter(false); setNewFilter(""); } }}
            onBlur={addCustomCategory}
            placeholder="Filter name…"
            className="px-3 py-1.5 rounded-full text-xs bg-transparent border border-black/[0.14] dark:border-white/[0.14] outline-none w-28"
          />
        ) : (
          <button
            onClick={() => setAddingFilter(true)}
            className="px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wide border border-dashed border-black/[0.2] dark:border-white/[0.2] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Filter
          </button>
        )}
      </div>

      {error ? (
        <EmptyPlate
          code="L3 · ERROR"
          title="Couldn't load decorations."
          hint={error.message}
          icon={<LayoutGrid className="h-7 w-7" strokeWidth={1.5} />}
          action={<Button variant="outline" onClick={() => mutate()}>Retry</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyPlate
          code="L3 · EMPTY"
          title="No decorations yet"
          hint="Be the first to share — add photos of your door decs, bulletin boards, or hallway decorations."
          icon={<LayoutGrid className="h-7 w-7" strokeWidth={1.5} />}
          action={<Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Add Your First Decoration</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((dec: any) => {
            const isFavorited = dec.favoritedBy?.length > 0;
            const madeCount = dec._count?.madeBy || 0;
            const favCount = dec._count?.favoritedBy || 0;

            return (
              <div key={dec.id} className="overflow-hidden rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-card group hover:border-[hsl(var(--terracotta)/0.4)] transition-colors">
                {dec.imageUrl ? (
                  <div className="aspect-[4/3] bg-muted relative">
                    <img src={dec.imageUrl} alt={dec.title} className="w-full h-full object-cover" />
                    {dec.canEdit && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(dec)} className="p-1.5 rounded-full bg-black/90 dark:bg-white/90 hover:bg-white text-foreground" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(dec.id)} className="p-1.5 rounded-full bg-black/90 dark:bg-white/90 hover:bg-white text-red-500" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-[hsl(var(--sage)/0.08)] flex items-center justify-center relative">
                    {dec.type === "DOOR_DECORATION" && <DoorOpen className="h-12 w-12 text-[hsl(var(--sage)/0.4)]" strokeWidth={1.5} />}
                    {dec.type === "BULLETIN_BOARD" && <LayoutGrid className="h-12 w-12 text-[hsl(var(--sage)/0.4)]" strokeWidth={1.5} />}
                    {dec.type === "HALLWAY_DECORATION" && <Ruler className="h-12 w-12 text-[hsl(var(--sage)/0.4)]" strokeWidth={1.5} />}
                    {dec.canEdit && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(dec)} className="p-1.5 rounded-full bg-black/90 dark:bg-white/90 hover:bg-white text-foreground" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(dec.id)} className="p-1.5 rounded-full bg-black/90 dark:bg-white/90 hover:bg-white text-red-500" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-display text-lg leading-tight">{dec.title}</h3>
                  {dec.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{dec.description}</p>}

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className="wayfinding text-muted-foreground">{dec.type.replace(/_/g, " ")}</span>
                    <span className="wayfinding text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]">{dec.category.replace(/_/g, " ")}</span>
                    {dec.costEstimate != null && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground tabular-nums">
                        <DollarSign className="h-3 w-3" />{dec.costEstimate.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {dec.materials?.length > 0 && (
                    <div className="mt-3 pt-3 rule">
                      <p className="wayfinding text-muted-foreground mb-1.5">Materials</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {dec.materials.slice(0, 3).map((m: any) => (
                          <li key={m.id}>
                            {m.url ? (
                              <a href={m.url} target="_blank" rel="noopener noreferrer" className="hover:text-[hsl(var(--terracotta))] dark:hover:text-[hsl(var(--terracotta-soft))] underline underline-offset-2">
                                {m.name}
                              </a>
                            ) : (
                              m.name
                            )}
                            {m.quantity ? ` (${m.quantity})` : ""}{m.cost ? ` — $${m.cost.toFixed(2)}` : ""}
                          </li>
                        ))}
                        {dec.materials.length > 3 && <li>+{dec.materials.length - 3} more</li>}
                      </ul>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 mt-3 pt-3 rule">
                    <button
                      onClick={() => handleFavorite(dec.id)}
                      className={`flex items-center gap-1 text-xs ${isFavorited ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
                    >
                      <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
                      {favCount > 0 && <span>{favCount}</span>}
                    </button>

                    <button
                      onClick={() => setShowMadeForm(showMadeForm === dec.id ? null : dec.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-[hsl(var(--sage))] dark:hover:text-[hsl(var(--sage-soft))]"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>I made this{madeCount > 0 ? ` (${madeCount})` : ""}</span>
                    </button>
                  </div>

                  {/* "I made this" form */}
                  {showMadeForm === dec.id && (
                    <div className="mt-3 pt-3 rule space-y-2">
                      <Input
                        value={madeData.imageUrl}
                        onChange={(e) => setMadeData({ ...madeData, imageUrl: e.target.value })}
                        placeholder="Photo URL of yours (optional)"
                        className="h-8 text-sm"
                      />
                      <Input
                        value={madeData.notes}
                        onChange={(e) => setMadeData({ ...madeData, notes: e.target.value })}
                        placeholder="Any notes or tips? (optional)"
                        className="h-8 text-sm"
                      />
                      <Button size="sm" onClick={() => handleMadeThis(dec.id)}>Submit</Button>
                    </div>
                  )}

                  {/* Who made this */}
                  {dec.madeBy?.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      Made by {dec.madeBy.map((m: any) => m.user?.name).filter(Boolean).join(", ")}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">by {dec.user?.name || "Unknown"}</p>
                    {dec.fileUrl && (
                      <a href={dec.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] hover:underline">
                        <ExternalLink className="h-3 w-3" /> Source
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
