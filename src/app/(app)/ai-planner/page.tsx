"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const audiences = [
  "First-Year Residents",
  "Upperclass Residents",
  "All Residents",
  "Returning Students",
  "Transfer Students",
  "Graduate Students",
];

const goals = [
  "Community Building",
  "Wellness",
  "Academic Success",
  "Diversity & Inclusion",
  "Career Development",
  "Sustainability",
  "Leadership",
  "Social",
];

export default function AIPlannerPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const { data: usage, mutate: mutateUsage } = useSWR("/api/ai-planner", fetcher);
  const [form, setForm] = useState({
    budget: "",
    audience: "First-Year Residents",
    goal: "Community Building",
    attendance: "",
  });

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/ai-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to generate");

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to generate");
        setLoading(false);
        return;
      }
      setResult(data.response);
      mutateUsage();
    } catch {
      toast.error("Failed to generate event plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-accent glow-sm">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <span className="gradient-text">AI Event Planner</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          Let AI help you plan the perfect program for your residents
        </p>
      </div>

      {usage && (
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">{usage.used} / {usage.limit} requests this month</span>
                <span className="text-primary font-medium">{usage.remaining} remaining</span>
              </div>
              <div className="h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                  style={{ width: `${(usage.used / usage.limit) * 100}%` }}
                />
              </div>
            </div>
            {usage.isAdmin && (
              <span className="text-xs text-muted-foreground bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full">
                Admin
              </span>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-accent/[0.03]" />
        <CardHeader className="relative">
          <CardTitle>What are you planning?</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <form onSubmit={handleGenerate} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Budget ($)</label>
                <Input
                  type="number"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  placeholder="100"
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Expected Attendance</label>
                <Input
                  type="number"
                  value={form.attendance}
                  onChange={(e) => setForm({ ...form, attendance: e.target.value })}
                  placeholder="40"
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Target Audience</label>
                <select
                  className="mt-1.5 flex h-10 w-full rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary/30 outline-none"
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                >
                  {audiences.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Programming Goal</label>
                <select
                  className="mt-1.5 flex h-10 w-full rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary/30 outline-none"
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                >
                  {goals.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 text-base">
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate Event Ideas
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-6 prose prose-sm max-w-none prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground">
              <div dangerouslySetInnerHTML={{ __html: formatMarkdown(result) }} />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

function formatMarkdown(text: string): string {
  return text
    .replace(/## (.*)/g, '<h2 class="text-lg font-semibold mt-6 mb-2 gradient-text">$1</h2>')
    .replace(/### (.*)/g, '<h3 class="text-base font-semibold mt-4 mb-1">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/- (.*)/g, '<li class="ml-4">$1</li>')
    .replace(/\n/g, "<br />");
}
