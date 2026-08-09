"use client";

import { useState } from "react";
import useSWR from "swr";
import { Check, Plus, Pencil, X } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface Tag {
  id: string;
  name: string;
  color: string;
  kind: string;
}

// A palette to offer when creating a tag; names double as the default tag name.
const SWATCHES = [
  { name: "Sage", color: "#3f6b52" },
  { name: "Terracotta", color: "#c05f3c" },
  { name: "Ochre", color: "#d99a3e" },
  { name: "Sky", color: "#5b8fb0" },
  { name: "Plum", color: "#7a5b7e" },
  { name: "Clay", color: "#9c5a3c" },
  { name: "Moss", color: "#6b8e4e" },
  { name: "Rose", color: "#b0566a" },
];

/**
 * Tag selector that replaces raw colour pickers. Pick an existing tag, or create
 * one by choosing a swatch (name defaults to the colour's name) and optionally
 * renaming it. Also supports renaming existing tags inline. Controlled via
 * `value` (tag id) + `onChange`.
 */
export function TagPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (tagId: string | null) => void;
}) {
  const { data: tags, mutate } = useSWR<Tag[]>("/api/tags", fetcher);
  const [creating, setCreating] = useState(false);
  const [newColor, setNewColor] = useState(SWATCHES[0]);
  const [newName, setNewName] = useState(SWATCHES[0].name);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const list = Array.isArray(tags) ? tags : [];

  const createTag = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor.color }),
    });
    if (res.ok) {
      const tag = await res.json();
      await mutate();
      onChange(tag.id);
      setCreating(false);
      toast.success(`Tag "${tag.name}" created`);
    } else {
      toast.error("Failed to create tag");
    }
  };

  const renameTag = async (id: string) => {
    if (!editName.trim()) return;
    const res = await fetch("/api/tags", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: editName.trim() }),
    });
    if (res.ok) {
      await mutate();
      setEditingId(null);
      toast.success("Tag renamed");
    } else {
      toast.error("Failed to rename");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {list.map((tag) => {
          const selected = value === tag.id;
          if (editingId === tag.id) {
            return (
              <span key={tag.id} className="inline-flex items-center gap-1 rounded-full border border-black/[0.14] dark:border-white/[0.14] pl-2 pr-1 py-1">
                <span className="h-3 w-3 rounded-full" style={{ background: tag.color }} />
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && renameTag(tag.id)}
                  className="w-24 bg-transparent text-sm outline-none"
                />
                <button type="button" onClick={() => renameTag(tag.id)} className="p-0.5 text-[hsl(var(--sage))]"><Check className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => setEditingId(null)} className="p-0.5 text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
              </span>
            );
          }
          return (
            <span key={tag.id} className="inline-flex items-center">
              <button
                type="button"
                onClick={() => onChange(selected ? null : tag.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border pl-2.5 pr-3 py-1.5 text-sm transition-colors ${
                  selected
                    ? "border-transparent text-white"
                    : "border-black/[0.14] dark:border-white/[0.14] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                }`}
                style={selected ? { background: tag.color } : undefined}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: selected ? "rgba(255,255,255,0.9)" : tag.color }} />
                {tag.name}
                {selected && <Check className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => { setEditingId(tag.id); setEditName(tag.name); }}
                className="ml-0.5 p-1 text-muted-foreground/50 hover:text-foreground"
                title="Rename tag"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </span>
          );
        })}

        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-black/[0.2] dark:border-white/[0.2] px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> New tag
          </button>
        )}
      </div>

      {creating && (
        <div className="rounded-xl border border-black/[0.1] dark:border-white/[0.1] p-3 space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            {SWATCHES.map((s) => (
              <button
                key={s.color}
                type="button"
                onClick={() => { setNewColor(s); if (!newName || SWATCHES.some((x) => x.name === newName)) setNewName(s.name); }}
                className={`h-7 w-7 rounded-full border-2 transition-transform ${newColor.color === s.color ? "scale-110 border-black/40 dark:border-white/60" : "border-transparent"}`}
                style={{ background: s.color }}
                title={s.name}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tag name"
              className="flex-1 h-9 rounded-lg border border-black/[0.14] dark:border-white/[0.14] bg-transparent px-3 text-sm outline-none"
              onKeyDown={(e) => e.key === "Enter" && createTag()}
            />
            <button type="button" onClick={createTag} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm">Add</button>
            <button type="button" onClick={() => setCreating(false)} className="h-9 px-3 rounded-lg text-sm text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
