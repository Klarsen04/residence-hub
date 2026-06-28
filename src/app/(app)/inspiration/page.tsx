"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Heart, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const categories = [
  "All",
  "WELCOME_WEEK",
  "PASSIVE_PROGRAMS",
  "ACTIVE_PROGRAMS",
  "STUDY_BREAKS",
  "FINALS_WEEK",
  "WELLNESS",
  "COMMUNITY_BUILDING",
  "DIVERSITY_PROGRAMMING",
  "SEASONAL_EVENTS",
];

const sources = ["PINTEREST", "INSTAGRAM", "TIKTOK", "YOUTUBE", "UPLOAD"];

export default function InspirationPage() {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
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

  const filtered = (inspirations || []).filter((item: any) => {
    if (filter !== "All" && item.category !== filter) return false;
    if (search && !item.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inspiration</h1>
          <p className="text-muted-foreground">Save and organize your programming ideas</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Save Inspiration
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Name this inspiration..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">URL</label>
                  <Input
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Source</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                  >
                    {sources.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                <label className="text-sm font-medium">Tags (comma separated)</label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="cozy, fall, movie night..."
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Save</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inspiration..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={filter === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(cat)}
          >
            {cat === "All" ? "All" : cat.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No inspiration found. Start saving ideas!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {filtered.map((item: any) => (
            <Card key={item.id} className="break-inside-avoid overflow-hidden">
              {item.imageUrl && (
                <div className="aspect-[4/3] bg-muted">
                  <img src={item.imageUrl} alt={item.title || ""} className="w-full h-full object-cover" />
                </div>
              )}
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{item.title || "Untitled"}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {item.source}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <button className="text-muted-foreground hover:text-red-500">
                      <Heart className="h-4 w-4" />
                    </button>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.map((tag: string) => (
                      <span key={tag} className="text-xs text-muted-foreground">#{tag}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
