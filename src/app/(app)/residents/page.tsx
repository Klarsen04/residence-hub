"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Home, Phone, Mail, Star, Plus, X, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PageHeader, SectionMarker, EmptyPlate } from "@/components/wayfinding/PageChrome";

interface Resident {
  id: string;
  name: string;
  room: string;
  floor?: string | null;
  wing?: string | null;
  phone?: string;
  email?: string;
  moveInDate?: string;
  year?: string;
  major?: string;
  notes?: string;
  flagged: boolean;
  ownerId: string;
  ownerName: string;
  canEdit: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// This dorm's structure: floors 1 & 2 have East/West wings; floor 3 is a single wing.
const FLOORS = ["1", "2", "3"];
const wingsFor = (floor: string) => (floor === "3" ? ["Main"] : ["East", "West"]);

export default function ResidentsPage() {
  const { data: residents, error, isLoading, mutate } = useSWR<Resident[]>("/api/residents", fetcher);
  const [search, setSearch] = useState("");
  const [selectedResident, setSelectedResident] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newResident, setNewResident] = useState({
    name: "", room: "", floor: "1", wing: "East", phone: "", email: "", year: "", major: "", notes: "", moveInDate: "",
  });

  const list = Array.isArray(residents) ? residents : [];

  const filtered = list.filter((r) => {
    const s = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(s) ||
      r.room.includes(s) ||
      r.major?.toLowerCase().includes(s) ||
      r.ownerName.toLowerCase().includes(s)
    );
  });

  // Group by RA (owner), so the roster reads as "each RA's floor".
  const byRA = filtered.reduce<Record<string, { name: string; residents: Resident[] }>>((acc, r) => {
    acc[r.ownerId] ??= { name: r.ownerName, residents: [] };
    acc[r.ownerId].residents.push(r);
    return acc;
  }, {});
  const raGroups = Object.entries(byRA).sort((a, b) => a[1].name.localeCompare(b[1].name));

  const locationLabel = (r: Resident) => {
    if (!r.floor) return `Rm ${r.room}`;
    const wing = r.wing && r.wing !== "Main" ? ` ${r.wing}` : "";
    return `Fl ${r.floor}${wing} · Rm ${r.room}`;
  };

  const saveField = async (r: Resident, patch: Partial<Resident>) => {
    try {
      const res = await fetch("/api/residents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, ...patch }),
      });
      if (!res.ok) throw new Error();
      await mutate();
      return true;
    } catch {
      toast.error("Failed to update resident");
      return false;
    }
  };

  const addNote = async (r: Resident) => {
    const note = noteInputs[r.id];
    if (!note?.trim()) return;
    const updatedNotes = r.notes ? `${r.notes}\n${note}` : note;
    if (await saveField(r, { notes: updatedNotes })) {
      setNoteInputs({ ...noteInputs, [r.id]: "" });
      toast.success("Note added");
    }
  };

  const removeResident = async (r: Resident) => {
    if (!confirm(`Remove ${r.name} from the roster?`)) return;
    try {
      const res = await fetch(`/api/residents?id=${r.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await mutate();
      toast.success("Resident removed");
    } catch {
      toast.error("Failed to remove resident");
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
      if (!res.ok) throw new Error();
      await mutate();
      setNewResident({ name: "", room: "", floor: "1", wing: "East", phone: "", email: "", year: "", major: "", notes: "", moveInDate: "" });
      setShowAddForm(false);
      toast.success("Resident added");
    } catch {
      toast.error("Failed to add resident");
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><p className="wayfinding text-muted-foreground">Loading roster…</p></div>;
  }
  if (error) {
    return <div className="flex items-center justify-center py-20"><p className="text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">Failed to load residents.</p></div>;
  }

  const selectClass = "h-10 rounded-lg border border-black/[0.14] dark:border-white/[0.14] bg-transparent px-3 text-sm";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-5xl">
      <PageHeader
        code="02 · FLOOR ROSTER"
        title="Floor Roster"
        subtitle={`${list.length} resident${list.length !== 1 ? "s" : ""} across ${raGroups.length} RA${raGroups.length !== 1 ? "s" : ""} — the directory for your building, room by room.`}
        action={
          <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAddForm ? "Cancel" : "Add Resident"}
          </Button>
        }
      />

      {showAddForm && (
        <div className="mb-8 rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-card p-5 space-y-4">
          <div className="flex items-baseline gap-3">
            <span className="wayfinding text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">NEW ENTRY</span>
            <h3 className="font-display text-xl">Added to your floor</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Name *" value={newResident.name} onChange={(e) => setNewResident({ ...newResident, name: e.target.value })} />
            <Input placeholder="Room *" value={newResident.room} onChange={(e) => setNewResident({ ...newResident, room: e.target.value })} />
            <select
              className={selectClass}
              value={newResident.floor}
              onChange={(e) => {
                const floor = e.target.value;
                setNewResident({ ...newResident, floor, wing: wingsFor(floor)[0] });
              }}
            >
              {FLOORS.map((f) => <option key={f} value={f}>Floor {f}</option>)}
            </select>
            <select className={selectClass} value={newResident.wing} onChange={(e) => setNewResident({ ...newResident, wing: e.target.value })}>
              {wingsFor(newResident.floor).map((w) => <option key={w} value={w}>{w === "Main" ? "Main (single wing)" : `${w} Wing`}</option>)}
            </select>
            <Input placeholder="Phone" value={newResident.phone} onChange={(e) => setNewResident({ ...newResident, phone: e.target.value })} />
            <Input placeholder="Email" value={newResident.email} onChange={(e) => setNewResident({ ...newResident, email: e.target.value })} />
            <Input placeholder="Year (e.g. First-Year)" value={newResident.year} onChange={(e) => setNewResident({ ...newResident, year: e.target.value })} />
            <Input placeholder="Major" value={newResident.major} onChange={(e) => setNewResident({ ...newResident, major: e.target.value })} />
          </div>
          <Button onClick={addResident}>Save Resident</Button>
        </div>
      )}

      <div className="relative max-w-sm mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, room, major, or RA..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {list.length === 0 ? (
        <EmptyPlate
          code="02 · EMPTY"
          title="Add your first resident"
          hint='Click "Add Resident" above to build your floor roster.'
          icon={<Home className="h-7 w-7" strokeWidth={1.5} />}
        />
      ) : (
        <div className="space-y-12">
          {raGroups.map(([ownerId, group]) => (
            <div key={ownerId}>
              <SectionMarker
                code={group.name.charAt(0).toUpperCase()}
                label={`${group.name}'s floor`}
                right={<span className="wayfinding text-muted-foreground">{group.residents.length} rooms</span>}
              />
              <div className="grid gap-px bg-black/[0.08] dark:bg-white/[0.08] rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] md:grid-cols-2">
                {group.residents.map((resident) => (
                  <div
                    key={resident.id}
                    className="group bg-card cursor-pointer transition-colors hover:bg-[hsl(var(--sage)/0.06)]"
                    onClick={() => setSelectedResident(selectedResident === resident.id ? null : resident.id)}
                  >
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-11 w-11 rounded-lg flex items-center justify-center font-display text-lg tabular-nums shrink-0 ${resident.flagged ? "bg-[hsl(var(--terracotta)/0.14)] text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]" : "bg-black/[0.05] dark:bg-white/[0.06] text-foreground"}`}>
                          {resident.room}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm truncate">{resident.name}</h3>
                            {resident.flagged && <Star className="h-3 w-3 text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] fill-current shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{resident.year}{resident.major ? ` • ${resident.major}` : ""}</p>
                        </div>
                        <span className="wayfinding text-muted-foreground shrink-0 text-right">{locationLabel(resident)}</span>
                      </div>

                      {selectedResident === resident.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 pt-3 rule space-y-2">
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            {resident.phone && <a href={`tel:${resident.phone}`} className="flex items-center gap-1 hover:text-[hsl(var(--terracotta))] dark:hover:text-[hsl(var(--terracotta-soft))]" onClick={(e) => e.stopPropagation()}><Phone className="h-3 w-3" /> {resident.phone}</a>}
                            {resident.email && <a href={`mailto:${resident.email}`} className="flex items-center gap-1 hover:text-[hsl(var(--terracotta))] dark:hover:text-[hsl(var(--terracotta-soft))]" onClick={(e) => e.stopPropagation()}><Mail className="h-3 w-3" /> {resident.email}</a>}
                          </div>
                          {resident.notes && (
                            <div className="p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                              <p className="text-[11px] text-muted-foreground whitespace-pre-line">{resident.notes}</p>
                            </div>
                          )}
                          {resident.canEdit ? (
                            <div className="flex gap-2 flex-wrap">
                              <Input value={noteInputs[resident.id] || ""} onChange={(e) => setNoteInputs({ ...noteInputs, [resident.id]: e.target.value })} placeholder="Add a note..." className="h-7 text-xs flex-1 min-w-[120px]" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); addNote(resident); } }} />
                              <Button size="sm" className="h-7 text-xs px-2" onClick={(e) => { e.stopPropagation(); addNote(resident); }}>Add</Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={(e) => { e.stopPropagation(); saveField(resident, { flagged: !resident.flagged }); }}>{resident.flagged ? "Unflag" : "Flag"}</Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]" onClick={(e) => { e.stopPropagation(); removeResident(resident); }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground italic">Managed by {resident.ownerName}</p>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
