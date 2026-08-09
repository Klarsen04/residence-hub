"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, X, Users } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  createdAt: string;
  active: boolean;
  createdBy?: string;
  votedOption?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function PollsPage() {
  const { data: polls, mutate, isLoading } = useSWR<Poll[]>("/api/polls", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", ""]);

  const vote = async (pollId: string, optionId: string) => {
    try {
      const res = await fetch("/api/polls", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, optionId }),
      });
      if (!res.ok) throw new Error("Failed to vote");
      await mutate();
      toast.success("Vote recorded!");
    } catch {
      toast.error("Failed to record vote");
    }
  };

  const createPoll = async () => {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) {
      toast.error("Need a question and at least 2 options");
      return;
    }
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, options: options.filter(o => o.trim()) }),
      });
      if (!res.ok) throw new Error("Failed to create poll");
      await mutate();
      setShowForm(false);
      setQuestion("");
      setOptions(["", "", ""]);
      toast.success("Poll created!");
    } catch {
      toast.error("Failed to create poll");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading polls...</div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-3xl mx-auto">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quick Polls</h1>
          <p className="text-muted-foreground mt-1">Get feedback from your residents</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          New Poll
        </Button>
      </motion.div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/20">
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Question</label>
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What do you want to ask?"
                  className="mt-1.5"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Options</label>
                <div className="space-y-2 mt-1.5">
                  {options.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...options];
                          newOpts[i] = e.target.value;
                          setOptions(newOpts);
                        }}
                        placeholder={`Option ${i + 1}`}
                      />
                      {options.length > 2 && (
                        <Button variant="ghost" size="icon" onClick={() => setOptions(options.filter((_, idx) => idx !== i))}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {options.length < 6 && (
                    <Button variant="outline" size="sm" onClick={() => setOptions([...options, ""])}>
                      + Add Option
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={createPoll}>Create Poll</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={item} className="space-y-4">
        {(polls || []).map((poll) => {
          const maxVotes = Math.max(...poll.options.map(o => o.votes));
          return (
            <Card key={poll.id} className={poll.active ? "border-primary/10" : ""}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{poll.question}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {poll.totalVotes} votes
                      </span>
                      <span className="text-xs text-muted-foreground">{poll.createdAt}</span>
                    </div>
                  </div>
                  <Badge className={poll.active ? "bg-emerald-500/15 text-emerald-400" : "bg-black/[0.06] dark:bg-white/[0.06] text-muted-foreground"}>
                    {poll.active ? "Active" : "Closed"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {poll.options.map((option) => {
                    const percent = poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0;
                    const isVoted = poll.votedOption === option.id;
                    const isWinning = option.votes === maxVotes && poll.totalVotes > 0;

                    return (
                      <button
                        key={option.id}
                        onClick={() => poll.active && !poll.votedOption && vote(poll.id, option.id)}
                        disabled={!poll.active || !!poll.votedOption}
                        className={`w-full text-left relative overflow-hidden rounded-xl border p-3 transition-all duration-200 ${
                          isVoted
                            ? "border-primary/30 bg-primary/[0.05]"
                            : poll.votedOption || !poll.active
                            ? "border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02]"
                            : "border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] hover:border-primary/20 hover:bg-primary/[0.03] cursor-pointer"
                        }`}
                      >
                        {(poll.votedOption || !poll.active) && (
                          <div
                            className={`absolute inset-y-0 left-0 transition-all duration-500 ${isWinning ? "bg-primary/10" : "bg-black/[0.03] dark:bg-white/[0.03]"}`}
                            style={{ width: `${percent}%` }}
                          />
                        )}
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isVoted && <Check className="h-3.5 w-3.5 text-primary" />}
                            <span className={`text-sm ${isVoted ? "font-medium text-primary" : ""}`}>
                              {option.text}
                            </span>
                          </div>
                          {(poll.votedOption || !poll.active) && (
                            <span className="text-xs text-muted-foreground font-medium">
                              {Math.round(percent)}%
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
