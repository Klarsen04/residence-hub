"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PageHeader, SectionMarker } from "@/components/wayfinding/PageChrome";

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

  const labelClass = "wayfinding text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl"
    >
      <PageHeader
        code="01·A · NEW"
        title="Post an Event"
        subtitle="Add a new listing to the board — residents will see it the moment it goes up."
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        <section>
          <SectionMarker code="A" label="The basics" />
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Movie Night, Study Break, Floor Meeting..."
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea
                className="mt-1.5 flex min-h-[100px] w-full rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all placeholder:text-muted-foreground"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe your event..."
              />
            </div>
          </div>
        </section>

        <section>
          <SectionMarker code="B" label="When & where" />
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Date</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className={labelClass}>Start Time</label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className={labelClass}>End Time</label>
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
              <label className={labelClass}>Location</label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Floor lounge, community room, outdoor space..."
                className="mt-1.5"
              />
            </div>
          </div>
        </section>

        <section>
          <SectionMarker code="C" label="Category" />
          <div>
            <label className={labelClass}>Category</label>
            <select
              className="mt-1.5 flex h-10 w-full rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary/30 outline-none"
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
        </section>

        <div className="flex gap-3 pt-2 rule pt-6">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Event"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
