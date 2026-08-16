"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, DoorOpen, LayoutGrid, Ruler, Trash2, Heart, Pencil, Upload, X, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PageHeader, SectionMarker, EmptyPlate } from "@/components/wayfinding/PageChrome";
import { compressImageToDataUrl } from "@/lib/photoUpload";
import { validateStoredImage } from "@/lib/photo";

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

const typeIcons: Record<string, typeof DoorOpen> = {
  DOOR_DECORATION: DoorOpen,
  BULLETIN_BOARD: LayoutGrid,
  HALLWAY_DECORATION: Ruler,
};

export default function DecorationsPage() {
  const suggested = getSuggestedCategory();
  const defaultCategory = suggested !== "ALL" ? suggested : "WELCOME_WEEK";
  const emptyForm = { title: "", type: "DOOR_DECORATION", category: defaultCategory, imageUrl: "" };

  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const fileInput = useRef<HTMLInputElement>(null);
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

  const openNewForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  // Uploaded photos are downscaled here and stored inline on the record, since
  // there's no file storage behind the app.
  const handlePickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear the input so picking the same file again after a remove still fires.
    e.target.value = "";
    if (!file) return;

    setPreparingPhoto(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setForm((f) => ({ ...f, imageUrl: dataUrl }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't use that photo");
    } finally {
      setPreparingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Catch a bad pasted link before the round trip; the API checks too.
    const imageError = validateStoredImage(form.imageUrl);
    if (imageError) {
      toast.error(imageError);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(editingId ? `/api/decorations/${editingId}` : "/api/decorations", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          category: form.category,
          imageUrl: form.imageUrl || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error);
      }
      toast.success(editingId ? "Decoration updated" : "Posted to the gallery");
      closeForm();
      mutate();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : editingId ? "Failed to update decoration" : "Failed to post decoration");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (dec: any) => {
    setEditingId(dec.id);
    setForm({
      title: dec.title || "",
      type: dec.type || "DOOR_DECORATION",
      category: dec.category || defaultCategory,
      imageUrl: dec.imageUrl || "",
    });
    setShowForm(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFavorite = async (id: string) => {
    try {
      const res = await fetch(`/api/decorations/${id}/favorite`, { method: "POST" });
      if (!res.ok) throw new Error();
      mutate();
    } catch {
      toast.error("Failed to update favorite");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this decoration? This can't be undone.")) return;
    try {
      const res = await fetch(`/api/decorations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Deleted");
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
      return d.title.toLowerCase().includes(s) || d.user?.name?.toLowerCase().includes(s);
    }
    return true;
  });

  const selectClass =
    "mt-1.5 flex h-10 w-full rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--terracotta)/0.3)] focus:border-[hsl(var(--terracotta)/0.4)] transition-all";

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
        subtitle="What the team has actually put up. Post a photo of your door decs, bulletin boards, and hallway displays so they're kept for everyone to see."
        action={
          <Button onClick={() => (showForm ? closeForm() : openNewForm())}>
            <Plus className="h-4 w-4 mr-2" />
            Post Decoration
          </Button>
        }
      />

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-card p-6">
            <div className="wayfinding text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] mb-5">
              {editingId ? "Edit decoration" : "Post a decoration you made"}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="wayfinding text-muted-foreground">Photo</label>
                {form.imageUrl ? (
                  <div className="mt-1.5 flex items-start gap-3">
                    <div className="relative h-28 w-36 shrink-0 overflow-hidden rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element -- data URLs and arbitrary hosts, so next/image can't optimize these */}
                      <img src={form.imageUrl} alt="Selected decoration" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, imageUrl: "" })}
                        className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                        title="Remove photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">
                      Remove it to swap in a different photo.
                    </p>
                  </div>
                ) : (
                  <div className="mt-1.5 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => fileInput.current?.click()} disabled={preparingPhoto}>
                        <Upload className="h-4 w-4 mr-2" />
                        {preparingPhoto ? "Preparing…" : "Upload photo"}
                      </Button>
                      <span className="text-xs text-muted-foreground">or paste a link</span>
                    </div>
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/*"
                      onChange={handlePickPhoto}
                      className="hidden"
                      aria-label="Upload a photo of your decoration"
                    />
                    <Input
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      placeholder="https://... (paste image link)"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="wayfinding text-muted-foreground">Type *</label>
                  <select className={selectClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {types.filter((t) => t.value !== "ALL").map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="wayfinding text-muted-foreground">Season/Theme *</label>
                  <select className={selectClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {allCategories.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving || preparingPhoto}>
                  {saving ? "Saving..." : editingId ? "Save changes" : "Post Decoration"}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      <SectionMarker
        code="✦"
        label="Gallery"
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
          title="Nothing posted yet"
          hint="Made something? Post a photo of it — door decs, bulletin boards, or hallway displays — and it's kept here for the whole team."
          icon={<LayoutGrid className="h-7 w-7" strokeWidth={1.5} />}
          action={<Button onClick={openNewForm}><Plus className="h-4 w-4 mr-2" />Post Your First Decoration</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((dec: any) => {
            const isFavorited = dec.favoritedBy?.length > 0;
            const favCount = dec._count?.favoritedBy || 0;
            const TypeIcon = typeIcons[dec.type] || ImageOff;

            return (
              <div key={dec.id} className="overflow-hidden rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-card group hover:border-[hsl(var(--terracotta)/0.4)] transition-colors">
                <div className={`aspect-[4/3] relative ${dec.imageUrl ? "bg-muted" : "bg-[hsl(var(--sage)/0.08)] flex items-center justify-center"}`}>
                  {dec.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- data URLs and arbitrary hosts, so next/image can't optimize these */
                    <img src={dec.imageUrl} alt={dec.title} className="w-full h-full object-cover" />
                  ) : (
                    <TypeIcon className="h-12 w-12 text-[hsl(var(--sage)/0.4)]" strokeWidth={1.5} />
                  )}
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

                <div className="p-4">
                  <h3 className="font-display text-lg leading-tight">{dec.title}</h3>

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="wayfinding text-muted-foreground">{dec.type.replace(/_/g, " ")}</span>
                    <span className="wayfinding text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]">{dec.category.replace(/_/g, " ")}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 mt-3 pt-3 rule">
                    <p className="text-xs text-muted-foreground truncate">by {dec.user?.name || "Unknown"}</p>
                    <button
                      onClick={() => handleFavorite(dec.id)}
                      className={`flex items-center gap-1 text-xs shrink-0 ${isFavorited ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
                      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
                      {favCount > 0 && <span>{favCount}</span>}
                    </button>
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
