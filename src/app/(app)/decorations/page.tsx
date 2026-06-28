"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, DoorOpen, LayoutGrid, Ruler, Pencil, Trash2, ExternalLink, DollarSign } from "lucide-react";
import { toast } from "sonner";

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

export default function DecorationsPage() {
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: decorations, mutate } = useSWR("/api/decorations", fetcher);

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "DOOR_DECORATION",
    category: "WELCOME_WEEK",
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
        title: "", description: "", type: "DOOR_DECORATION", category: "WELCOME_WEEK",
        imageUrl: "", instructions: "", costEstimate: "", materials: [{ name: "", quantity: "", cost: "" }],
      });
      mutate();
    } catch {
      toast.error("Failed to add decoration");
    } finally {
      setSaving(false);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Decoration Hub</h1>
          <p className="text-muted-foreground">Share and discover door decs, bulletin boards, and hallway ideas</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Decoration
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Fall Leaf Door Decs, Growth Mindset Board..."
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Photo URL</label>
                  <Input
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://... (paste image link or Pinterest URL)"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type *</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {types.filter((t) => t.value !== "ALL").map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Season/Theme *</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the decoration..."
                />
              </div>

              <div>
                <label className="text-sm font-medium">Instructions</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  placeholder="Step-by-step how to make it..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Materials Needed</label>
                  <Button type="button" variant="outline" size="sm" onClick={addMaterial}>
                    + Add Material
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.materials.map((mat, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        value={mat.name}
                        onChange={(e) => updateMaterial(i, "name", e.target.value)}
                        placeholder="Material name"
                        className="flex-1"
                      />
                      <Input
                        value={mat.quantity}
                        onChange={(e) => updateMaterial(i, "quantity", e.target.value)}
                        placeholder="Qty"
                        className="w-20"
                      />
                      <Input
                        value={mat.cost}
                        onChange={(e) => updateMaterial(i, "cost", e.target.value)}
                        placeholder="$"
                        className="w-20"
                        type="number"
                        step="0.01"
                      />
                      {form.materials.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(i)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-32">
                <label className="text-sm font-medium">Est. Total Cost</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.costEstimate}
                  onChange={(e) => setForm({ ...form, costEstimate: e.target.value })}
                  placeholder="$0.00"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Add Decoration"}
                </Button>
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
            placeholder="Search decorations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {types.map((t) => (
          <Button
            key={t.value}
            variant={typeFilter === t.value ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={categoryFilter === "ALL" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setCategoryFilter("ALL")}
        >
          All Seasons
        </Button>
        {decorationCategories.map((c) => (
          <Button
            key={c.value}
            variant={categoryFilter === c.value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setCategoryFilter(c.value)}
          >
            {c.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-primary/10">
                <LayoutGrid className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">No decorations yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mt-2">
                Be the first to share a decoration idea! Add photos of your door decs,
                bulletin boards, or hallway decorations so others can get inspired.
              </p>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Decoration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((dec: any) => (
            <Card key={dec.id} className="overflow-hidden group hover:shadow-md transition-shadow">
              {dec.imageUrl ? (
                <div className="aspect-[4/3] bg-muted relative">
                  <img src={dec.imageUrl} alt={dec.title} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDelete(dec.id)}
                      className="p-1.5 rounded-full bg-white/90 hover:bg-white text-red-500"
                    >
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
                    <button
                      onClick={() => handleDelete(dec.id)}
                      className="p-1.5 rounded-full bg-white/90 hover:bg-white text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
              <CardContent className="p-4">
                <h3 className="font-semibold">{dec.title}</h3>
                {dec.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{dec.description}</p>
                )}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {dec.type.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {dec.category.replace(/_/g, " ")}
                  </Badge>
                  {dec.costEstimate != null && (
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      {dec.costEstimate.toFixed(2)}
                    </span>
                  )}
                </div>
                {dec.materials?.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium mb-1">Materials:</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {dec.materials.slice(0, 4).map((m: any) => (
                        <li key={m.id}>
                          {m.name}{m.quantity ? ` (${m.quantity})` : ""}{m.cost ? ` — $${m.cost.toFixed(2)}` : ""}
                        </li>
                      ))}
                      {dec.materials.length > 4 && (
                        <li className="text-primary">+{dec.materials.length - 4} more</li>
                      )}
                    </ul>
                  </div>
                )}
                {dec.instructions && (
                  <p className="text-xs text-primary mt-2 cursor-pointer hover:underline">
                    View instructions
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  by {dec.user?.name || "Unknown"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
