"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, DoorOpen, LayoutGrid, Ruler, Trash2, Heart, CheckCircle, Users, DollarSign, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
  const { data: decorations, mutate } = useSWR("/api/decorations", fetcher);

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "DOOR_DECORATION",
    category: suggested !== "ALL" ? suggested : "WELCOME_WEEK",
    imageUrl: "",
    instructions: "",
    costEstimate: "",
    materials: [{ name: "", quantity: "", cost: "" }],
  });

  const addMaterial = () => {
    setForm({ ...form, materials: [...form.materials, { name: "", quantity: "", cost: "" }] });
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
        .map((m) => ({ name: m.name, quantity: m.quantity, cost: m.cost ? parseFloat(m.cost) : null }));

      const res = await fetch("/api/decorations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          type: form.type,
          category: form.category,
          imageUrl: form.imageUrl || null,
          instructions: form.instructions || null,
          costEstimate: form.costEstimate ? parseFloat(form.costEstimate) : null,
          materials,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Decoration added!");
      setShowForm(false);
      setForm({
        title: "", description: "", type: "DOOR_DECORATION", category: suggested !== "ALL" ? suggested : "WELCOME_WEEK",
        imageUrl: "", instructions: "", costEstimate: "", materials: [{ name: "", quantity: "", cost: "" }],
      });
      mutate();
    } catch {
      toast.error("Failed to add decoration");
    } finally {
      setSaving(false);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Decoration Hub</h1>
          <p className="text-muted-foreground mt-1">Share and discover door decs, bulletin boards, and hallway ideas</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Decoration
        </Button>
      </div>

      {suggested !== "ALL" && categoryFilter === "ALL" && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/[0.05] border border-primary/20">
          <div className="p-2 rounded-xl bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm flex-1">
            It&apos;s <span className="font-medium text-primary">{decorationCategories.find((c) => c.value === suggested)?.label}</span> season!
          </span>
          <Button size="sm" variant="outline" onClick={() => setCategoryFilter(suggested)}>
            Show ideas
          </Button>
        </div>
      )}

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-primary/20">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Title *</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Fall Leaf Door Decs, Growth Mindset Board..."
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Photo URL</label>
                  <Input
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://... (paste image link)"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type *</label>
                  <select
                    className="mt-1.5 flex h-10 w-full rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary/30 outline-none"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {types.filter((t) => t.value !== "ALL").map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Season/Theme *</label>
                  <select
                    className="mt-1.5 flex h-10 w-full rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary/30 outline-none"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {decorationCategories.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <textarea
                  className="mt-1.5 flex min-h-[80px] w-full rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description..."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Instructions</label>
                <textarea
                  className="mt-1.5 flex min-h-[80px] w-full rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  placeholder="Step-by-step how to make it..."
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Materials Needed</label>
                  <Button type="button" variant="outline" size="sm" onClick={addMaterial}>+ Add</Button>
                </div>
                <div className="space-y-2">
                  {form.materials.map((mat, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input value={mat.name} onChange={(e) => updateMaterial(i, "name", e.target.value)} placeholder="Material" className="flex-1" />
                      <Input value={mat.quantity} onChange={(e) => updateMaterial(i, "quantity", e.target.value)} placeholder="Qty" className="w-20" />
                      <Input value={mat.cost} onChange={(e) => updateMaterial(i, "cost", e.target.value)} placeholder="$" className="w-20" type="number" step="0.01" />
                      {form.materials.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(i)}><Trash2 className="h-4 w-4" /></Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-32">
                <label className="text-sm font-medium">Est. Total Cost</label>
                <Input type="number" step="0.01" value={form.costEstimate} onChange={(e) => setForm({ ...form, costEstimate: e.target.value })} placeholder="$0.00" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add Decoration"}</Button>
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
          <Input placeholder="Search decorations..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {types.map((t) => (
          <button
            key={t.value}
            onClick={() => setTypeFilter(t.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              typeFilter === t.value
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-black/[0.04] dark:bg-white/[0.04] text-muted-foreground border border-black/[0.06] dark:border-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] hover:text-foreground"
            }`}
          >{t.label}</button>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setCategoryFilter("ALL")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            categoryFilter === "ALL"
              ? "bg-accent/20 text-accent border border-accent/30"
              : "bg-black/[0.04] dark:bg-white/[0.04] text-muted-foreground border border-black/[0.06] dark:border-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] hover:text-foreground"
          }`}
        >All Seasons</button>
        {decorationCategories.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategoryFilter(c.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              categoryFilter === c.value
                ? "bg-accent/20 text-accent border border-accent/30"
                : "bg-black/[0.04] dark:bg-white/[0.04] text-muted-foreground border border-black/[0.06] dark:border-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] hover:text-foreground"
            }`}
          >{c.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <div className="flex justify-center"><div className="p-4 rounded-2xl bg-primary/10"><LayoutGrid className="h-12 w-12 text-primary" /></div></div>
            <div>
              <h3 className="text-lg font-semibold">No decorations yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mt-2">Be the first to share! Add photos of your door decs, bulletin boards, or hallway decorations.</p>
            </div>
            <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Add Your First Decoration</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((dec: any) => {
            const isFavorited = dec.favoritedBy?.length > 0;
            const madeCount = dec._count?.madeBy || 0;
            const favCount = dec._count?.favoritedBy || 0;

            return (
              <Card key={dec.id} className="overflow-hidden group hover:border-black/[0.15] dark:hover:border-white/[0.15] hover:-translate-y-0.5">
                {dec.imageUrl ? (
                  <div className="aspect-[4/3] bg-muted relative">
                    <img src={dec.imageUrl} alt={dec.title} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDelete(dec.id)} className="p-1.5 rounded-full bg-black/90 dark:bg-white/90 hover:bg-white text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center relative">
                    {dec.type === "DOOR_DECORATION" && <DoorOpen className="h-12 w-12 text-primary/30" />}
                    {dec.type === "BULLETIN_BOARD" && <LayoutGrid className="h-12 w-12 text-primary/30" />}
                    {dec.type === "HALLWAY_DECORATION" && <Ruler className="h-12 w-12 text-primary/30" />}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDelete(dec.id)} className="p-1.5 rounded-full bg-black/90 dark:bg-white/90 hover:bg-white text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                <CardContent className="p-4">
                  <h3 className="font-semibold">{dec.title}</h3>
                  {dec.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{dec.description}</p>}

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Badge variant="outline" className="text-xs">{dec.type.replace(/_/g, " ")}</Badge>
                    <Badge variant="secondary" className="text-xs">{dec.category.replace(/_/g, " ")}</Badge>
                    {dec.costEstimate != null && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <DollarSign className="h-3 w-3" />{dec.costEstimate.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {dec.materials?.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium mb-1">Materials:</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {dec.materials.slice(0, 3).map((m: any) => (
                          <li key={m.id}>{m.name}{m.quantity ? ` (${m.quantity})` : ""}{m.cost ? ` — $${m.cost.toFixed(2)}` : ""}</li>
                        ))}
                        {dec.materials.length > 3 && <li>+{dec.materials.length - 3} more</li>}
                      </ul>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                    <button
                      onClick={() => handleFavorite(dec.id)}
                      className={`flex items-center gap-1 text-xs ${isFavorited ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
                    >
                      <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
                      {favCount > 0 && <span>{favCount}</span>}
                    </button>

                    <button
                      onClick={() => setShowMadeForm(showMadeForm === dec.id ? null : dec.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-green-600"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>I made this{madeCount > 0 ? ` (${madeCount})` : ""}</span>
                    </button>
                  </div>

                  {/* "I made this" form */}
                  {showMadeForm === dec.id && (
                    <div className="mt-3 pt-3 border-t space-y-2">
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

                  <p className="text-xs text-muted-foreground mt-2">by {dec.user?.name || "Unknown"}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
