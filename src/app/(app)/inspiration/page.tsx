"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ExternalLink, Play, Pencil, Trash2, X, Check, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PageHeader, SectionMarker, EmptyPlate } from "@/components/wayfinding/PageChrome";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const categories = [
  "All",
  "COMMUNITY_BUILDING",
  "WELLNESS",
  "ACADEMIC_SUCCESS",
  "DIVERSITY_INCLUSION",
  "CAREER_DEVELOPMENT",
  "SUSTAINABILITY",
  "LEADERSHIP",
  "SOCIAL",
];

const sources = ["PINTEREST", "INSTAGRAM", "TIKTOK", "YOUTUBE", "UPLOAD"];

function parseTags(tags: any): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getEmbedUrl(url: string, source: string): string | null {
  if (!url) return null;
  if (source === "YOUTUBE" || url.includes("youtube.com") || url.includes("youtu.be")) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

function getThumbnail(url: string, source: string): string | null {
  if (!url) return null;
  if (source === "YOUTUBE" || url.includes("youtube.com") || url.includes("youtu.be")) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/]+)/);
    if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  }
  return null;
}

const selectClass =
  "mt-1.5 flex h-10 w-full rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--terracotta)/0.3)] focus:border-[hsl(var(--terracotta)/0.4)] transition-all";
const fieldLabel = "wayfinding text-muted-foreground";

export default function InspirationPage() {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", url: "", source: "", category: "", tags: "" });
  const { data: inspirations, mutate } = useSWR("/api/inspiration", fetcher);

  const [form, setForm] = useState({
    title: "",
    url: "",
    source: "PINTEREST",
    category: "WELCOME_WEEK",
    tags: "",
  });
  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch a live preview (Pinterest-style) when a URL is pasted/blurred.
  const loadPreview = async (url: string) => {
    if (!url || !/^https?:\/\//i.test(url)) { setPreview(null); return; }
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/inspiration/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      setPreview(data);
      // Auto-fill the title from the preview if the user hasn't typed one.
      if (data.title && !form.title) setForm((f) => ({ ...f, title: data.title }));
    } catch {
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/inspiration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Inspiration saved!");
      setShowForm(false);
      setForm({ title: "", url: "", source: "PINTEREST", category: "WELCOME_WEEK", tags: "" });
      setPreview(null);
      mutate();
    } catch {
      toast.error("Failed to save inspiration");
    }
  };

  const startEdit = (item: any) => {
    const tags = parseTags(item.tags);
    setEditingId(item.id);
    setEditForm({
      title: item.title || "",
      url: item.url || "",
      source: item.source || "PINTEREST",
      category: item.category || "WELCOME_WEEK",
      tags: tags.join(", "),
    });
  };

  const handleEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/inspiration/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          tags: editForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Updated!");
      setEditingId(null);
      mutate();
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this inspiration?")) return;
    try {
      const res = await fetch(`/api/inspiration/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Deleted!");
      mutate();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const filtered = (inspirations || []).filter((item: any) => {
    if (filter !== "All" && item.category !== filter) return false;
    if (search && !item.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl"
    >
      <PageHeader
        code="L3 · INSPIRATION"
        title="Inspiration"
        subtitle="A pinboard for the programming ideas and references you want to keep."
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Save Inspiration
          </Button>
        }
      />

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-card p-6">
            <div className="wayfinding text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] mb-5">
              New pin
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={fieldLabel}>Title</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Name this inspiration..."
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className={fieldLabel}>URL</label>
                  <Input
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    onBlur={(e) => loadPreview(e.target.value)}
                    onPaste={(e) => { const v = e.clipboardData.getData("text"); if (v) setTimeout(() => loadPreview(v), 0); }}
                    placeholder="Paste a link, image, or video URL..."
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className={fieldLabel}>Source</label>
                  <select
                    className={selectClass}
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                  >
                    {sources.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={fieldLabel}>Category</label>
                  <select
                    className={selectClass}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {categories.filter((c) => c !== "All").map((c) => (
                      <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={fieldLabel}>Tags (comma separated)</label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="cozy, fall, movie night..."
                  className="mt-1.5"
                />
              </div>
              {(previewLoading || preview) && (
                <div className="rounded-lg border border-black/[0.08] dark:border-white/[0.08] overflow-hidden bg-black/[0.02] dark:bg-white/[0.02]">
                  {previewLoading ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">Loading preview…</div>
                  ) : preview?.kind === "video" && preview.embedUrl ? (
                    <div className="aspect-video w-full">
                      <iframe src={preview.embedUrl} className="w-full h-full" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen title="preview" />
                    </div>
                  ) : preview?.kind === "video" && preview.videoUrl ? (
                    <video src={preview.videoUrl} controls className="w-full max-h-72 bg-black" />
                  ) : preview?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview.imageUrl}
                      alt={preview.title || "preview"}
                      className="w-full max-h-72 object-cover"
                      onError={(e) => {
                        // If the upsized Pinterest "originals" URL 404s, fall back to 736x.
                        const img = e.currentTarget;
                        if (img.src.includes("/originals/")) img.src = img.src.replace("/originals/", "/736x/");
                      }}
                    />
                  ) : (
                    <div className="p-4 text-sm">
                      <p className="font-medium">{preview?.title || "Link preview"}</p>
                      <p className="text-xs text-muted-foreground truncate">{form.url}</p>
                    </div>
                  )}
                  {preview?.title && (preview.imageUrl || preview.embedUrl) && (
                    <p className="px-4 py-2 text-xs text-muted-foreground truncate border-t border-black/[0.06] dark:border-white/[0.06]">{preview.title}</p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit">Save</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setPreview(null); }}>Cancel</Button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      <SectionMarker
        code="✦"
        label="The wall"
        right={
          <div className="relative w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inspiration..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        }
      />

      <div className="flex gap-2 flex-wrap mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wide transition-all duration-200 ${
              filter === cat
                ? "bg-[hsl(var(--terracotta)/0.14)] text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] border border-[hsl(var(--terracotta)/0.3)]"
                : "bg-black/[0.03] dark:bg-white/[0.04] text-muted-foreground border border-black/[0.08] dark:border-white/[0.08] hover:text-foreground"
            }`}
          >
            {cat === "All" ? "All" : cat.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyPlate
          code="L3 · EMPTY"
          title="Nothing pinned yet"
          hint="Paste a link, image, or video and it lands on the wall."
          icon={<Lightbulb className="h-7 w-7" strokeWidth={1.5} />}
        />
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
          {filtered.map((item: any) => {
            const tags = parseTags(item.tags);
            const embedUrl = getEmbedUrl(item.url, item.source);
            const thumbnail = getThumbnail(item.url, item.source);
            const isPlaying = playingId === item.id;
            const isEditing = editingId === item.id;

            if (isEditing) {
              return (
                <div key={item.id} className="break-inside-avoid overflow-hidden rounded-xl border border-[hsl(var(--terracotta)/0.35)] bg-card">
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="wayfinding text-muted-foreground">Title</label>
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="h-8 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="wayfinding text-muted-foreground">URL</label>
                      <Input
                        value={editForm.url}
                        onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                        className="h-8 text-sm mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="wayfinding text-muted-foreground">Source</label>
                        <select
                          className="mt-1 flex h-8 w-full rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-2 text-xs"
                          value={editForm.source}
                          onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                        >
                          {sources.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="wayfinding text-muted-foreground">Category</label>
                        <select
                          className="mt-1 flex h-8 w-full rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-2 text-xs"
                          value={editForm.category}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        >
                          {categories.filter((c) => c !== "All").map((c) => (
                            <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="wayfinding text-muted-foreground">Tags</label>
                      <Input
                        value={editForm.tags}
                        onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                        className="h-8 text-sm mt-1"
                        placeholder="tag1, tag2..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleEdit(item.id)}>
                        <Check className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={item.id} className="break-inside-avoid overflow-hidden rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-card group hover:border-[hsl(var(--terracotta)/0.4)] transition-colors">
                {embedUrl && isPlaying ? (
                  <div className="aspect-video">
                    <iframe
                      src={embedUrl + "?autoplay=1"}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : thumbnail ? (
                  <div
                    className="aspect-video bg-black/[0.03] dark:bg-white/[0.03] relative cursor-pointer overflow-hidden"
                    onClick={() => setPlayingId(item.id)}
                  >
                    <img src={thumbnail} alt={item.title || ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-black/90 dark:bg-white/90 flex items-center justify-center shadow-lg">
                        <Play className="h-5 w-5 text-black ml-0.5" />
                      </div>
                    </div>
                  </div>
                ) : item.imageUrl ? (
                  <div className="aspect-[4/3] bg-black/[0.03] dark:bg-white/[0.03] overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.title || ""}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.src.includes("/originals/")) img.src = img.src.replace("/originals/", "/736x/");
                      }}
                    />
                  </div>
                ) : item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 bg-black/[0.03] dark:bg-white/[0.03] border-b border-black/[0.06] dark:border-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.url}</span>
                    </div>
                  </a>
                ) : null}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display text-base leading-snug">{item.title || "Untitled"}</p>
                      <span className="wayfinding text-muted-foreground mt-1.5 inline-block">{item.source}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(item)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-[hsl(var(--terracotta))] hover:bg-[hsl(var(--terracotta)/0.1)] opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-muted-foreground hover:text-[hsl(var(--terracotta))] hover:bg-[hsl(var(--terracotta)/0.1)] transition-all">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {tags.map((tag: string) => (
                        <span key={tag} className="text-[11px] text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))] bg-[hsl(var(--sage)/0.1)] px-2 py-0.5 rounded-full">#{tag}</span>
                      ))}
                    </div>
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
