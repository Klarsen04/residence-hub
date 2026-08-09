"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, StickyNote, Trash2, Pin, PinOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, SectionMarker, EmptyPlate } from "@/components/wayfinding/PageChrome";

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

const noteColorNames = ["purple", "blue", "emerald", "amber", "pink", "cyan"];

// Each note gets a warm tint from the wayfinding palette. The stored color
// names are kept for compatibility; here they map to a top accent hairline.
function getAccentClass(color: string): string {
  const map: Record<string, string> = {
    purple: "bg-[hsl(var(--terracotta))]",
    blue: "bg-[hsl(var(--sage))]",
    emerald: "bg-[hsl(var(--sage))]",
    amber: "bg-[hsl(var(--terracotta))]",
    pink: "bg-[hsl(var(--terracotta-soft))]",
    cyan: "bg-[hsl(var(--sage-soft))]",
  };
  return map[color] || map.purple;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function NotesPage() {
  const { data: notes, error, isLoading, mutate } = useSWR<Note[]>("/api/notes", fetcher);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const addNote = async () => {
    if (!newTitle.trim() && !newContent.trim()) return;
    const color = noteColorNames[(notes?.length ?? 0) % noteColorNames.length];
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle || "Untitled", content: newContent, color }),
    });
    mutate();
    setNewTitle("");
    setNewContent("");
    setShowNew(false);
  };

  const deleteNote = async (id: string) => {
    await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    mutate();
  };

  const togglePin = async (id: string) => {
    const note = notes?.find((n) => n.id === id);
    if (!note) return;
    await fetch("/api/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, pinned: !note.pinned }),
    });
    mutate();
  };

  const startEditing = (note: Note) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const saveEdit = async (id: string) => {
    await fetch("/api/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title: editTitle || "Untitled", content: editContent }),
    });
    mutate();
    setEditingId(null);
  };

  const sortedNotes = [...(notes || [])].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Failed to load notes.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-7xl"
    >
      <PageHeader
        code="L2 · NOTES"
        title="Quick Notes"
        subtitle="Your personal noticeboard — ideas, reminders, and things to pin up."
        action={
          <Button onClick={() => setShowNew(!showNew)}>
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        }
      />

      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-10">
            <div className="rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-card p-5 space-y-3">
              <div className="wayfinding text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">
                Pin a note
              </div>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Note title..."
                autoFocus
              />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write your note..."
                className="w-full min-h-[100px] rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--terracotta)/0.3)] focus:border-[hsl(var(--terracotta)/0.4)] transition-all placeholder:text-muted-foreground"
              />
              <div className="flex gap-2">
                <Button onClick={addNote}>Save Note</Button>
                <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SectionMarker code="✦" label="The board" />

      {sortedNotes.length === 0 ? (
        <EmptyPlate
          code="L2 · EMPTY"
          title="Nothing pinned yet"
          hint="Jot down a reminder or idea and it stays on your board."
          icon={<StickyNote className="h-7 w-7" strokeWidth={1.5} />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedNotes.map((note) => (
            <motion.div key={note.id} layout>
              <div className="group relative overflow-hidden rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-card p-5 transition-colors hover:border-black/[0.2] dark:hover:border-white/[0.2]">
                <span className={`absolute inset-x-0 top-0 h-1 ${getAccentClass(note.color)}`} />
                {note.pinned && (
                  <div className="absolute top-3 right-3">
                    <Pin className="h-3 w-3 text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] fill-current" />
                  </div>
                )}
                {editingId === note.id ? (
                  <div className="space-y-2 pt-1">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-8 text-sm font-display"
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full min-h-[80px] rounded-lg border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.03] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--terracotta)/0.3)] transition-all"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(note.id)}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3
                      className="font-display text-lg leading-tight mb-2 cursor-pointer hover:text-[hsl(var(--terracotta))] dark:hover:text-[hsl(var(--terracotta-soft))] transition-colors pt-1"
                      onClick={() => startEditing(note)}
                    >
                      {note.title}
                    </h3>
                    <p className="text-sm text-black/70 dark:text-white/70 whitespace-pre-line line-clamp-6">{note.content}</p>
                    <div className="flex items-center justify-between mt-4 pt-3 rule">
                      <span className="wayfinding text-muted-foreground">{note.createdAt}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => togglePin(note.id)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-[hsl(var(--terracotta))] hover:bg-[hsl(var(--terracotta)/0.1)] transition-all"
                        >
                          {note.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
