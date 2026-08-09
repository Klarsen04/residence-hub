"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Plus, User, Search } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PageHeader, SectionMarker, Plate, PlateRow, EmptyPlate } from "@/components/wayfinding/PageChrome";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface CheckIn {
  id: string;
  residentName: string;
  room: string;
  date: string;
  mood: "great" | "good" | "okay" | "struggling";
  topics: string[];
  notes: string;
  followUp: boolean;
}


const topicOptions = [
  "Academics", "Homesickness", "Roommate", "Social Life",
  "Mental Health", "Career", "Financial", "Campus Involvement",
  "General Check-in", "Follow-up",
];

const moodConfig = {
  great: { label: "Great", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  good: { label: "Good", color: "bg-accent/15 text-accent border-accent/20" },
  okay: { label: "Okay", color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  struggling: { label: "Struggling", color: "bg-red-500/15 text-red-400 border-red-500/20" },
};

export default function CheckInsPage() {
  const { data: checkIns, mutate } = useSWR("/api/check-ins", fetcher);
  const { data: residents } = useSWR("/api/residents", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    residentId: "",
    residentName: "",
    room: "",
    mood: "good" as CheckIn["mood"],
    topics: [] as string[],
    notes: "",
    followUp: false,
  });

  const allCheckIns: CheckIn[] = Array.isArray(checkIns) ? checkIns : [];
  // Only your own residents are check-in-able (check-ins are per-RA).
  const allResidents = (Array.isArray(residents) ? residents : []).filter((r: any) => r.canEdit);
  const totalCheckIns = allCheckIns.length;

  const toggleTopic = (topic: string) => {
    setForm({
      ...form,
      topics: form.topics.includes(topic)
        ? form.topics.filter(t => t !== topic)
        : [...form.topics, topic],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.residentName.trim()) {
      toast.error("Please enter resident name");
      return;
    }
    try {
      const res = await fetch("/api/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setShowForm(false);
      setForm({ residentId: "", residentName: "", room: "", mood: "good", topics: [], notes: "", followUp: false });
      toast.success("Check-in logged!");
      mutate();
    } catch {
      toast.error("Failed to log check-in");
    }
  };

  const selectResident = (resident: any) => {
    setForm({ ...form, residentId: resident.id, residentName: resident.name, room: resident.room });
    setShowForm(true);
  };

  const filteredResidents = allResidents.filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.room.includes(search)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-5xl"
    >
      <PageHeader
        code="02·C · CHECK-INS"
        title="1:1 Check-Ins"
        subtitle="Track individual conversations with residents — a running log, one person at a time."
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Log Check-In
          </Button>
        }
      />

      <PlateRow className="grid-cols-3 mb-10">
        <Plate code="01" value={totalCheckIns} label="Total check-ins" accent />
        <Plate code="02" value={allResidents.length} label="Due for check-in" />
        <Plate code="03" value={allResidents.length} label="Residents" />
      </PlateRow>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-card">
            <div className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Resident</label>
                    <Input value={form.residentName} onChange={(e) => setForm({ ...form, residentName: e.target.value })} placeholder="Name" className="mt-1.5" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Room</label>
                    <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Room #" className="mt-1.5" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">How are they doing?</label>
                  <div className="flex gap-2">
                    {(Object.entries(moodConfig) as [CheckIn["mood"], typeof moodConfig.great][]).map(([key, config]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm({ ...form, mood: key })}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                          form.mood === key ? config.color : "border-black/[0.06] dark:border-white/[0.06] text-muted-foreground"
                        }`}
                      >
                        {config.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Topics Discussed</label>
                  <div className="flex flex-wrap gap-2">
                    {topicOptions.map(topic => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleTopic(topic)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          form.topics.includes(topic)
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "bg-black/[0.04] dark:bg-white/[0.04] text-muted-foreground border border-black/[0.06] dark:border-white/[0.06]"
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notes (private)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Key takeaways, concerns, follow-ups..."
                    className="mt-1.5 w-full min-h-[80px] rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.03] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.followUp} onChange={(e) => setForm({ ...form, followUp: e.target.checked })} className="rounded" />
                  <span className="text-sm text-muted-foreground">Follow-up needed</span>
                </label>

                <div className="flex gap-2">
                  <Button type="submit">Log Check-In</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      )}

      <div className="mb-12">
        <SectionMarker
          code="02·C"
          label="Your directory"
          right={
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="h-8 text-xs pl-8" />
            </div>
          }
        />
        {filteredResidents.length === 0 ? (
          <EmptyPlate
            code="02·C · EMPTY"
            title="No residents to check in"
            hint="Add residents to your floor roster to start logging conversations."
            icon={<MessageCircle className="h-7 w-7" strokeWidth={1.5} />}
          />
        ) : (
          <div className="grid gap-px bg-black/[0.08] dark:bg-white/[0.08] rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] md:grid-cols-2">
            {filteredResidents.map((resident: any) => (
              <div
                key={resident.id || resident.room}
                onClick={() => selectResident(resident)}
                className="group flex items-center gap-3 bg-card p-4 cursor-pointer transition-colors hover:bg-[hsl(var(--sage)/0.06)]"
              >
                <div className="h-10 w-10 rounded-lg bg-black/[0.05] dark:bg-white/[0.06] flex items-center justify-center font-display text-base tabular-nums shrink-0">
                  {resident.room}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{resident.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {resident.year || "Resident"}{resident.major ? ` • ${resident.major}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {allCheckIns.length > 0 && (
        <div>
          <SectionMarker code="✦" label="Recent check-ins" />
          <div>
            {allCheckIns.map((ci: any) => {
              const topics = ci.topics ? (typeof ci.topics === "string" ? JSON.parse(ci.topics) : ci.topics) : [];
              const mood = ci.mood as keyof typeof moodConfig;
              return (
                <div key={ci.id} className="group flex items-center gap-4 py-4 rule first:border-t-0">
                  <div className="p-2 rounded-lg bg-[hsl(var(--sage)/0.1)]">
                    <User className="h-4 w-4 text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ci.residentName}{ci.room ? ` (Rm ${ci.room})` : ""}</p>
                    <p className="wayfinding text-muted-foreground mt-0.5 normal-case">
                      {topics.length > 0 ? topics.join(", ") : "General"} • {new Date(ci.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {moodConfig[mood] && <Badge className={moodConfig[mood].color}>{moodConfig[mood].label}</Badge>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
