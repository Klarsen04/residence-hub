"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, StickyNote, Trash2, Pin, PinOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt: string;
}

const noteColors = [
  "from-purple-500/10 to-purple-500/5 border-purple-500/20",
  "from-blue-500/10 to-blue-500/5 border-blue-500/20",
  "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
  "from-amber-500/10 to-amber-500/5 border-amber-500/20",
  "from-pink-500/10 to-pink-500/5 border-pink-500/20",
  "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20",
];

const defaultNotes: Note[] = [
  { id: "1", title: "Event Ideas for November", content: "- Friendsgiving dinner\n- Gratitude wall\n- Movie marathon (holiday classics)\n- Care package making", color: noteColors[0], pinned: true, createdAt: "2 days ago" },
  { id: "2", title: "Maintenance Requests", content: "Room 312 - broken blinds\nRoom 405 - leaky faucet\nLounge - projector bulb needs replacing", color: noteColors[1], pinned: false, createdAt: "1 week ago" },
  { id: "3", title: "Meeting Notes - 7/18", content: "- New quiet hours policy starts Monday\n- Budget due by Friday\n- Floor Olympics team sign-ups open", color: noteColors[2], pinned: true, createdAt: "3 days ago" },
];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(defaultNotes);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const addNote = () => {
    if (!newTitle.trim() && !newContent.trim()) return;
    const newNote: Note = {
      id: Date.now().toString(),
      title: newTitle || "Untitled",
      content: newContent,
      color: noteColors[notes.length % noteColors.length],
      pinned: false,
      createdAt: "Just now",
    };
    setNotes([newNote, ...notes]);
    setNewTitle("");
    setNewContent("");
    setShowNew(false);
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  const togglePin = (id: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  };

  const updateNote = (id: string, title: string, content: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, title, content } : n));
    setEditingId(null);
  };

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

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
            <Card className="border-purple-500/20">
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
                  className="w-full min-h-[100px] rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all placeholder:text-muted-foreground"
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
              <div className={`group rounded-2xl border bg-gradient-to-br ${note.color} p-5 transition-all duration-200 hover:-translate-y-0.5 relative`}>
                {note.pinned && (
                  <div className="absolute top-3 right-3">
                    <Pin className="h-3 w-3 text-purple-400 fill-purple-400" />
                  </div>
                )}
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <Input
                      defaultValue={note.title}
                      id={`title-${note.id}`}
                      className="h-8 text-sm font-semibold"
                    />
                    <textarea
                      defaultValue={note.content}
                      id={`content-${note.id}`}
                      className="w-full min-h-[80px] rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => {
                        const title = (document.getElementById(`title-${note.id}`) as HTMLInputElement)?.value;
                        const content = (document.getElementById(`content-${note.id}`) as HTMLTextAreaElement)?.value;
                        updateNote(note.id, title || "Untitled", content || "");
                      }}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3
                      className="font-semibold text-sm mb-2 cursor-pointer hover:text-purple-400 transition-colors"
                      onClick={() => setEditingId(note.id)}
                    >
                      {note.title}
                    </h3>
                    <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-6">{note.content}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                      <span className="text-[10px] text-muted-foreground">{note.createdAt}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => togglePin(note.id)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-purple-400 hover:bg-purple-500/10 transition-all"
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
