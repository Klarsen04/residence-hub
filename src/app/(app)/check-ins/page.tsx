"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Plus, User, Clock, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

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
    residentName: "",
    room: "",
    mood: "good" as CheckIn["mood"],
    topics: [] as string[],
    notes: "",
    followUp: false,
  });

  const allCheckIns: CheckIn[] = checkIns || [];
  const allResidents = residents || [];
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
      setForm({ residentName: "", room: "", mood: "good", topics: [], notes: "", followUp: false });
      toast.success("Check-in logged!");
      mutate();
    } catch {
      toast.error("Failed to log check-in");
    }
  };

  const selectResident = (resident: any) => {
    setForm({ ...form, residentName: resident.name, room: resident.room });
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
      className="space-y-6 max-w-5xl"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">1:1 Check-Ins</h1>
            <p className="text-muted-foreground mt-0.5">Track individual conversations with residents</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Log Check-In
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-card">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Check-Ins</span>
          </div>
          <p className="text-2xl font-bold">{totalCheckIns}</p>
        </div>
        <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05]">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-amber-400">Due for Check-In</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{allResidents.length}</p>
        </div>
        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05]">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-emerald-400">Residents</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{allResidents.length}</p>
        </div>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/20">
            <CardContent className="p-5">
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
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Residents</h3>
          <div className="relative w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="h-8 text-xs pl-8" />
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {filteredResidents.map((resident: any) => (
            <div
              key={resident.id || resident.room}
              onClick={() => selectResident(resident)}
              className="flex items-center gap-3 p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06] hover:border-primary/20 cursor-pointer transition-all hover:-translate-y-0.5"
            >
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary flex items-center justify-center text-white font-bold text-xs">
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
      </div>

      {allCheckIns.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Check-Ins</h3>
          <div className="space-y-2">
            {allCheckIns.map((ci: any) => {
              const topics = ci.topics ? (typeof ci.topics === "string" ? JSON.parse(ci.topics) : ci.topics) : [];
              const mood = ci.mood as keyof typeof moodConfig;
              return (
                <Card key={ci.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{ci.residentName}{ci.room ? ` (Rm ${ci.room})` : ""}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {topics.length > 0 ? topics.join(", ") : "General"} • {new Date(ci.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {moodConfig[mood] && <Badge className={moodConfig[mood].color}>{moodConfig[mood].label}</Badge>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
