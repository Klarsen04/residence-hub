"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          AI Event Planner
        </h1>
        <p className="text-muted-foreground mt-1">
          Let AI help you plan the perfect program for your residents
        </p>
      </div>

      {usage && (
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span>{usage.used} / {usage.limit} requests used this month</span>
                <span>{usage.remaining} remaining</span>
              </div>
              <Progress value={(usage.used / usage.limit) * 100} />
            </div>
            {usage.isAdmin && (
              <span className="text-xs text-muted-foreground">
                Admin (unlimited) | {usage.totalUsers} users on platform
              </span>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>What are you planning?</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Budget ($)</label>
                <Input
                  type="number"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  placeholder="100"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Expected Attendance</label>
                <Input
                  type="number"
                  value={form.attendance}
                  onChange={(e) => setForm({ ...form, attendance: e.target.value })}
                  placeholder="40"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Target Audience</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                >
                  {audiences.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Programming Goal</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
        <Card>
          <CardContent className="p-6 prose prose-sm max-w-none dark:prose-invert">
            <div dangerouslySetInnerHTML={{ __html: formatMarkdown(result) }} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatMarkdown(text: string): string {
  return text
    .replace(/## (.*)/g, '<h2 class="text-lg font-semibold mt-6 mb-2">$1</h2>')
    .replace(/### (.*)/g, '<h3 class="text-base font-semibold mt-4 mb-1">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/- (.*)/g, '<li class="ml-4">$1</li>')
    .replace(/\n/g, "<br />");
}
