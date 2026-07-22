"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Home, Phone, Mail, Plus, Star, AlertCircle } from "lucide-react";
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

const defaultResidents: Resident[] = [
  { id: "1", name: "Jordan Martinez", room: "301", phone: "555-0101", email: "jmartinez@nyit.edu", moveInDate: "2026-08-20", year: "Sophomore", major: "Computer Science", notes: "", flagged: false },
  { id: "2", name: "Priya Patel", room: "302", phone: "555-0102", email: "ppatel@nyit.edu", moveInDate: "2026-08-20", year: "First-Year", major: "Biology", notes: "Roommate concerns early on - resolved", flagged: false },
  { id: "3", name: "Marcus Johnson", room: "303", phone: "555-0103", email: "mjohnson@nyit.edu", moveInDate: "2026-08-20", year: "Junior", major: "Business", notes: "", flagged: false },
  { id: "4", name: "Sarah Kim", room: "304", phone: "555-0104", email: "skim@nyit.edu", moveInDate: "2026-08-20", year: "First-Year", major: "Psychology", notes: "Very shy, check in regularly", flagged: true },
  { id: "5", name: "Alex Rivera", room: "305", phone: "555-0105", email: "arivera@nyit.edu", moveInDate: "2026-08-20", year: "Sophomore", major: "Engineering", notes: "", flagged: false },
  { id: "6", name: "Taylor Chen", room: "306", email: "tchen@nyit.edu", moveInDate: "2026-08-20", year: "First-Year", major: "Art", notes: "International student, loves cooking events", flagged: false },
  { id: "7", name: "Chris O'Brien", room: "307", phone: "555-0107", email: "cobrien@nyit.edu", moveInDate: "2026-08-20", year: "Senior", major: "History", notes: "", flagged: false },
  { id: "8", name: "Aisha Williams", room: "308", phone: "555-0108", email: "awilliams@nyit.edu", moveInDate: "2026-08-20", year: "First-Year", major: "Nursing", notes: "Very engaged in floor activities", flagged: false },
];

export default function ResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>(defaultResidents);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedResident, setSelectedResident] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");

  const filtered = residents.filter(r => {
    const s = search.toLowerCase();
    return r.name.toLowerCase().includes(s) || r.room.includes(s) || r.major?.toLowerCase().includes(s);
  });

  const flagged = residents.filter(r => r.flagged);

  const addNote = (id: string) => {
    if (!newNote.trim()) return;
    setResidents(residents.map(r => {
      if (r.id === id) {
        return { ...r, notes: r.notes ? `${r.notes}\n${newNote}` : newNote };
      }
      return r;
    }));
    setNewNote("");
    toast.success("Note added");
  };

  const toggleFlag = (id: string) => {
    setResidents(residents.map(r => r.id === id ? { ...r, flagged: !r.flagged } : r));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-5xl"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
            <Home className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Floor Roster</h1>
            <p className="text-muted-foreground mt-0.5">{residents.length} residents on your floor</p>
          </div>
        </div>
      </div>

      {flagged.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/[0.03]">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-medium">{flagged.length} resident{flagged.length > 1 ? "s" : ""} flagged for check-in</p>
              <p className="text-xs text-muted-foreground">{flagged.map(r => r.name).join(", ")}</p>
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

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((resident) => (
          <Card
            key={resident.id}
            className={`hover:border-white/[0.15] dark:hover:border-white/[0.15] hover:-translate-y-0.5 cursor-pointer ${resident.flagged ? "border-amber-500/20" : ""}`}
            onClick={() => setSelectedResident(selectedResident === resident.id ? null : resident.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
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
                  className="mt-3 pt-3 border-t border-white/[0.06] dark:border-white/[0.06] space-y-2"
                >
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {resident.phone && (
                      <a href={`tel:${resident.phone}`} className="flex items-center gap-1 hover:text-purple-400 transition-colors">
                        <Phone className="h-3 w-3" /> {resident.phone}
                      </a>
                    )}
                    {resident.email && (
                      <a href={`mailto:${resident.email}`} className="flex items-center gap-1 hover:text-purple-400 transition-colors">
                        <Mail className="h-3 w-3" /> {resident.email}
                      </a>
                    )}
                  </div>
                  {resident.notes && (
                    <div className="p-2 rounded-lg bg-white/[0.03] dark:bg-white/[0.03] border border-white/[0.06] dark:border-white/[0.06]">
                      <p className="text-[11px] text-muted-foreground whitespace-pre-line">{resident.notes}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
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
    </motion.div>
  );
}
