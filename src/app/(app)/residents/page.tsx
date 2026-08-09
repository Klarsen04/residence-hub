"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Home, Phone, Mail, Star, AlertCircle, Plus, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface Resident {
  id: string;
  name: string;
  room: string;
  phone?: string;
  email?: string;
  moveInDate: string;
  year: string;
  major?: string;
  notes?: string;
  flagged: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ResidentsPage() {
  const { data: residents, error, isLoading, mutate } = useSWR<Resident[]>("/api/residents", fetcher);
  const [search, setSearch] = useState("");
  const [selectedResident, setSelectedResident] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newResident, setNewResident] = useState({
    name: "",
    room: "",
    phone: "",
    email: "",
    year: "",
    major: "",
    notes: "",
    moveInDate: "",
  });

  const filtered = (residents || []).filter((r) => {
    const s = search.toLowerCase();
    return r.name.toLowerCase().includes(s) || r.room.includes(s) || r.major?.toLowerCase().includes(s);
  });

  const flagged = (residents || []).filter((r) => r.flagged);

  const addNote = async (id: string) => {
    const note = noteInputs[id];
    if (!note?.trim()) return;
    const resident = residents?.find((r) => r.id === id);
    if (!resident) return;

    const updatedNotes = resident.notes ? `${resident.notes}\n${note}` : note;

    try {
      const res = await fetch("/api/residents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: resident.name, room: resident.room, phone: resident.phone, email: resident.email, year: resident.year, major: resident.major, notes: updatedNotes, flagged: resident.flagged }),
      });
      if (!res.ok) throw new Error("Failed to update resident");
      await mutate();
      setNoteInputs({ ...noteInputs, [id]: "" });
      toast.success("Note added");
    } catch {
      toast.error("Failed to add note");
    }
  };

  const toggleFlag = async (id: string) => {
    const resident = residents?.find((r) => r.id === id);
    if (!resident) return;

    try {
      const res = await fetch("/api/residents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: resident.name, room: resident.room, phone: resident.phone, email: resident.email, year: resident.year, major: resident.major, notes: resident.notes, flagged: !resident.flagged }),
      });
      if (!res.ok) throw new Error("Failed to update resident");
      await mutate();
    } catch {
      toast.error("Failed to update flag");
    }
  };

  const addResident = async () => {
    if (!newResident.name.trim() || !newResident.room.trim()) {
      toast.error("Name and room are required");
      return;
    }

    try {
      const res = await fetch("/api/residents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newResident),
      });
      if (!res.ok) throw new Error("Failed to add resident");
      await mutate();
      setNewResident({ name: "", room: "", phone: "", email: "", year: "", major: "", notes: "", moveInDate: "" });
      setShowAddForm(false);
      toast.success("Resident added");
    } catch {
      toast.error("Failed to add resident");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading residents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-400">Failed to load residents.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-5xl"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-accent to-[hsl(var(--sage-soft))]">
            <Home className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Floor Roster</h1>
            <p className="text-muted-foreground mt-0.5">{(residents || []).length} residents on your floor</p>
          </div>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
          {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAddForm ? "Cancel" : "Add Resident"}
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">New Resident</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Name *"
                value={newResident.name}
                onChange={(e) => setNewResident({ ...newResident, name: e.target.value })}
              />
              <Input
                placeholder="Room *"
                value={newResident.room}
                onChange={(e) => setNewResident({ ...newResident, room: e.target.value })}
              />
              <Input
                placeholder="Phone"
                value={newResident.phone}
                onChange={(e) => setNewResident({ ...newResident, phone: e.target.value })}
              />
              <Input
                placeholder="Email"
                value={newResident.email}
                onChange={(e) => setNewResident({ ...newResident, email: e.target.value })}
              />
              <Input
                placeholder="Year (e.g. First-Year, Sophomore)"
                value={newResident.year}
                onChange={(e) => setNewResident({ ...newResident, year: e.target.value })}
              />
              <Input
                placeholder="Major"
                value={newResident.major}
                onChange={(e) => setNewResident({ ...newResident, major: e.target.value })}
              />
              <Input
                placeholder="Move-in date (YYYY-MM-DD)"
                value={newResident.moveInDate}
                onChange={(e) => setNewResident({ ...newResident, moveInDate: e.target.value })}
              />
              <Input
                placeholder="Notes"
                value={newResident.notes}
                onChange={(e) => setNewResident({ ...newResident, notes: e.target.value })}
              />
            </div>
            <Button onClick={addResident} className="mt-2">Save Resident</Button>
          </CardContent>
        </Card>
      )}

      {flagged.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/[0.03]">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-medium">{flagged.length} resident{flagged.length > 1 ? "s" : ""} flagged for check-in</p>
              <p className="text-xs text-muted-foreground">{flagged.map((r) => r.name).join(", ")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, room, or major..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {(!residents || residents.length === 0) ? (
        <Card>
          <CardContent className="p-10 flex flex-col items-center justify-center text-center">
            <Users className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg">Add your first resident</h3>
            <p className="text-sm text-muted-foreground mt-1">Click the "Add Resident" button above to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((resident) => (
            <Card
              key={resident.id}
              className={`hover:border-black/[0.15] dark:hover:border-white/[0.15] hover:-translate-y-0.5 cursor-pointer ${resident.flagged ? "border-amber-500/20" : ""}`}
              onClick={() => setSelectedResident(selectedResident === resident.id ? null : resident.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent to-[hsl(var(--sage-soft))] flex items-center justify-center text-white font-bold text-sm">
                    {resident.room}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm truncate">{resident.name}</h3>
                      {resident.flagged && <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {resident.year}{resident.major ? ` • ${resident.major}` : ""}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    Rm {resident.room}
                  </Badge>
                </div>

                {selectedResident === resident.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2"
                  >
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {resident.phone && (
                        <a href={`tel:${resident.phone}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                          <Phone className="h-3 w-3" /> {resident.phone}
                        </a>
                      )}
                      {resident.email && (
                        <a href={`mailto:${resident.email}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                          <Mail className="h-3 w-3" /> {resident.email}
                        </a>
                      )}
                    </div>
                    {resident.notes && (
                      <div className="p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                        <p className="text-[11px] text-muted-foreground whitespace-pre-line">{resident.notes}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={noteInputs[resident.id] || ""}
                        onChange={(e) => setNoteInputs({ ...noteInputs, [resident.id]: e.target.value })}
                        placeholder="Add a note..."
                        className="h-7 text-xs"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); addNote(resident.id); } }}
                      />
                      <Button size="sm" className="h-7 text-xs px-2" onClick={(e) => { e.stopPropagation(); addNote(resident.id); }}>
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                        onClick={(e) => { e.stopPropagation(); toggleFlag(resident.id); }}
                      >
                        {resident.flagged ? "Unflag" : "Flag"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
