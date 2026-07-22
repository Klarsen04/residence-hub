"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, ThumbsUp, ThumbsDown, Meh, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const moodOptions = [
  { value: "positive", icon: ThumbsUp, label: "Great", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  { value: "neutral", icon: Meh, label: "Okay", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { value: "negative", icon: ThumbsDown, label: "Needs Work", color: "text-red-400 bg-red-500/10 border-red-500/20" },
];

const categories = [
  "Events & Programming",
  "Floor Community",
  "Facilities & Maintenance",
  "Noise & Quiet Hours",
  "RA Support",
  "Suggestions",
  "Other",
];

export default function FeedbackPage() {
  const [submitted, setSubmitted] = useState(false);
  const [mood, setMood] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mood || !message.trim()) {
      toast.error("Please select a mood and write a message");
      return;
    }
    setSubmitted(true);
    toast.success("Feedback submitted! Thank you.");
  };

  const reset = () => {
    setSubmitted(false);
    setMood("");
    setCategory("");
    setMessage("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
          <MessageSquare className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Resident Feedback</h1>
          <p className="text-muted-foreground mt-0.5">Share anonymous feedback with your RA team</p>
        </div>
      </div>

      {submitted ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 rounded-2xl bg-emerald-500/10">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold">Thank you!</h3>
                <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                  Your feedback has been received. We review all submissions to improve the residential experience.
                </p>
              </div>
              <Button variant="outline" onClick={reset}>Submit Another</Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <Card className="overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.02] to-pink-500/[0.02]" />
          <CardContent className="p-6 relative">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-3">
                  How are you feeling about your residence experience?
                </label>
                <div className="flex gap-3">
                  {moodOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = mood === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setMood(option.value)}
                        className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 ${
                          isSelected
                            ? option.color
                            : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]"
                        }`}
                      >
                        <Icon className={`h-6 w-6 ${isSelected ? "" : "text-muted-foreground"}`} />
                        <span className={`text-xs font-medium ${isSelected ? "" : "text-muted-foreground"}`}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">Category (optional)</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(category === cat ? "" : cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                        category === cat
                          ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                          : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.08]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">Your Feedback</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind..."
                  className="w-full min-h-[120px] rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all placeholder:text-muted-foreground"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className="rounded border-white/[0.2] bg-white/[0.03]"
                  />
                  <span className="text-sm text-muted-foreground">Submit anonymously</span>
                </label>
                <Badge variant="secondary" className="text-[10px]">
                  {anonymous ? "Anonymous" : "Your name will be visible"}
                </Badge>
              </div>

              <Button type="submit" className="w-full h-12 text-base">
                <Send className="h-4 w-4 mr-2" />
                Submit Feedback
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
