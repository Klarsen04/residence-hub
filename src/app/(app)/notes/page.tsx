"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, StickyNote, Trash2, Pin, PinOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

function getColorClasses(color: string): string {
  const map: Record<string, string> = {
    purple: "from-primary/10 to-primary/5 border-primary/20",
    blue: "from-accent/10 to-accent/5 border-accent/20",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
    pink: "from-accent/10 to-accent/5 border-accent/20",
    cyan: "from-[hsl(var(--sage-soft))] to-[hsl(var(--sage-soft))] border-cyan-500/20",
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500">
            <StickyNote className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Quick Notes</h1>
            <p className="text-muted-foreground mt-0.5">Personal notepad for ideas and reminders</p>
          </div>
        </div>
        <Button onClick={() => setShowNew(!showNew)}>
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-primary/20">
              <CardContent className="p-5 space-y-3">
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
                  className="w-full min-h-[100px] rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all placeholder:text-muted-foreground"
                />
                <div className="flex gap-2">
                  <Button onClick={addNote}>Save Note</Button>
                  <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {sortedNotes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <StickyNote className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No notes yet. Create one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedNotes.map((note) => (
            <motion.div key={note.id} layout>
              <div className={`group rounded-2xl border bg-gradient-to-br ${getColorClasses(note.color)} p-5 transition-all duration-200 hover:-translate-y-0.5 relative`}>
                {note.pinned && (
                  <div className="absolute top-3 right-3">
                    <Pin className="h-3 w-3 text-primary fill-primary" />
                  </div>
                )}
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-8 text-sm font-semibold"
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full min-h-[80px] rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.03] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(note.id)}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3
                      className="font-semibold text-sm mb-2 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => startEditing(note)}
                    >
                      {note.title}
                    </h3>
                    <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-6">{note.content}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                      <span className="text-[10px] text-muted-foreground">{note.createdAt}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => togglePin(note.id)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
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
