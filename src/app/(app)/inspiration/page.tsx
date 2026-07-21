"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, ExternalLink, Play, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
      className="space-y-6 max-w-7xl"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inspiration</h1>
          <p className="text-muted-foreground mt-1">Save and organize your programming ideas</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Save Inspiration
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-purple-500/20">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Title</label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Name this inspiration..."
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">URL</label>
                    <Input
                      value={form.url}
                      onChange={(e) => setForm({ ...form, url: e.target.value })}
                      placeholder="https://..."
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Source</label>
                    <select
                      className="mt-1.5 flex h-10 w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 outline-none"
                      value={form.source}
                      onChange={(e) => setForm({ ...form, source: e.target.value })}
                    >
                      {sources.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <select
                      className="mt-1.5 flex h-10 w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 outline-none"
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
                  <label className="text-sm font-medium text-muted-foreground">Tags (comma separated)</label>
                  <Input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="cozy, fall, movie night..."
                    className="mt-1.5"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Save</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inspiration..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              filter === cat
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.08] hover:text-foreground"
            }`}
          >
            {cat === "All" ? "All" : cat.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No inspiration found. Start saving ideas!</p>
          </CardContent>
        </Card>
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
                <Card key={item.id} className="break-inside-avoid overflow-hidden border-purple-500/30">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Title</label>
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="h-8 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">URL</label>
                      <Input
                        value={editForm.url}
                        onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                        className="h-8 text-sm mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Source</label>
                        <select
                          className="mt-1 flex h-8 w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-2 text-xs"
                          value={editForm.source}
                          onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                        >
                          {sources.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Category</label>
                        <select
                          className="mt-1 flex h-8 w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-2 text-xs"
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
                      <label className="text-xs font-medium text-muted-foreground">Tags</label>
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
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card key={item.id} className="break-inside-avoid overflow-hidden group hover:border-white/[0.15] hover:-translate-y-0.5">
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
                    className="aspect-video bg-white/[0.03] relative cursor-pointer overflow-hidden"
                    onClick={() => setPlayingId(item.id)}
                  >
                    <img src={thumbnail} alt={item.title || ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <Play className="h-5 w-5 text-black ml-0.5" />
                      </div>
                    </div>
                  </div>
                ) : item.imageUrl ? (
                  <div className="aspect-[4/3] bg-white/[0.03] overflow-hidden">
                    <img src={item.imageUrl} alt={item.title || ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 bg-white/[0.03] border-b border-white/[0.06] hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm text-purple-400">
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.url}</span>
                    </div>
                  </a>
                ) : null}

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{item.title || "Untitled"}</p>
                      <Badge variant="secondary" className="mt-1.5">
                        {item.source}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(item)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-purple-400 hover:bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-all"
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
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-muted-foreground hover:text-purple-400 hover:bg-purple-500/10 transition-all">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.map((tag: string) => (
                        <span key={tag} className="text-[11px] text-purple-400/70 bg-purple-500/10 px-2 py-0.5 rounded-full">#{tag}</span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
