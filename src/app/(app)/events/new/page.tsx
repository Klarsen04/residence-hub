"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import Link from "next/link";

const categories = [
  { value: "COMMUNITY_BUILDING", label: "Community Building" },
  { value: "WELLNESS", label: "Wellness" },
  { value: "ACADEMIC_SUCCESS", label: "Academic Success" },
  { value: "DIVERSITY_INCLUSION", label: "Diversity & Inclusion" },
  { value: "CAREER_DEVELOPMENT", label: "Career Development" },
  { value: "SUSTAINABILITY", label: "Sustainability" },
  { value: "LEADERSHIP", label: "Leadership" },
  { value: "SOCIAL", label: "Social" },
];

export default function NewEventPage() {
  return (
    <Suspense>
      <NewEventForm />
    </Suspense>
  );
}

function NewEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: searchParams.get("title") || "",
    description: searchParams.get("description") || "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    category: searchParams.get("category") || "COMMUNITY_BUILDING",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create event");
      }

      const event = await res.json();
      toast.success("Event created!");
      router.push(`/events/${event.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500">
          <Calendar className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-3xl font-bold">Create New Event</h1>
      </div>

      <Card className="overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.02] to-blue-500/[0.02]" />
        <CardHeader className="relative">
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Movie Night, Study Break, Floor Meeting..."
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <textarea
                className="mt-1.5 flex min-h-[100px] w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all placeholder:text-muted-foreground"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe your event..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Start Time</label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">End Time</label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  required
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Location</label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Floor lounge, community room, outdoor space..."
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Category</label>
              <select
                className="mt-1.5 flex h-10 w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 outline-none"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Event"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
