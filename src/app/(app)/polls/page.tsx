"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, BarChart2, Check, X, Users } from "lucide-react";
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
  votedOption?: string;
}

const mockPolls: Poll[] = [
  {
    id: "1",
    question: "What movie should we watch this Friday?",
    options: [
      { id: "a", text: "The Super Mario Bros. Movie", votes: 12 },
      { id: "b", text: "Spider-Verse", votes: 18 },
      { id: "c", text: "Barbie", votes: 8 },
      { id: "d", text: "Oppenheimer", votes: 5 },
    ],
    totalVotes: 43,
    createdAt: "2 days ago",
    active: true,
  },
  {
    id: "2",
    question: "Best time for study break during finals?",
    options: [
      { id: "a", text: "8 PM", votes: 22 },
      { id: "b", text: "9 PM", votes: 15 },
      { id: "c", text: "10 PM", votes: 8 },
    ],
    totalVotes: 45,
    createdAt: "1 week ago",
    active: false,
    votedOption: "a",
  },
  {
    id: "3",
    question: "Floor lounge improvements — what should we add?",
    options: [
      { id: "a", text: "Bean bag chairs", votes: 25 },
      { id: "b", text: "More board games", votes: 14 },
      { id: "c", text: "Better lighting", votes: 9 },
      { id: "d", text: "Plants", votes: 18 },
    ],
    totalVotes: 66,
    createdAt: "3 days ago",
    active: true,
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>(mockPolls);
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", ""]);

  const vote = (pollId: string, optionId: string) => {
    setPolls(polls.map(p => {
      if (p.id === pollId && !p.votedOption) {
        return {
          ...p,
          votedOption: optionId,
          totalVotes: p.totalVotes + 1,
          options: p.options.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o),
        };
      }
      return p;
    }));
    toast.success("Vote recorded!");
  };

  const createPoll = () => {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) {
      toast.error("Need a question and at least 2 options");
      return;
    }
    const newPoll: Poll = {
      id: Date.now().toString(),
      question,
      options: options.filter(o => o.trim()).map((text, i) => ({ id: String(i), text, votes: 0 })),
      totalVotes: 0,
      createdAt: "Just now",
      active: true,
    };
    setPolls([newPoll, ...polls]);
    setShowForm(false);
    setQuestion("");
    setOptions(["", "", ""]);
    toast.success("Poll created!");
  };

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
          <Card className="border-purple-500/20">
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
        {polls.map((poll) => {
          const maxVotes = Math.max(...poll.options.map(o => o.votes));
          return (
            <Card key={poll.id} className={poll.active ? "border-purple-500/10" : ""}>
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
                  <Badge className={poll.active ? "bg-emerald-500/15 text-emerald-400" : "bg-white/[0.06] text-muted-foreground"}>
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
                            ? "border-purple-500/30 bg-purple-500/[0.05]"
                            : poll.votedOption || !poll.active
                            ? "border-white/[0.06] bg-white/[0.02]"
                            : "border-white/[0.08] bg-white/[0.02] hover:border-purple-500/20 hover:bg-purple-500/[0.03] cursor-pointer"
                        }`}
                      >
                        {(poll.votedOption || !poll.active) && (
                          <div
                            className={`absolute inset-y-0 left-0 transition-all duration-500 ${isWinning ? "bg-purple-500/10" : "bg-white/[0.03]"}`}
                            style={{ width: `${percent}%` }}
                          />
                        )}
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isVoted && <Check className="h-3.5 w-3.5 text-purple-400" />}
                            <span className={`text-sm ${isVoted ? "font-medium text-purple-400" : ""}`}>
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
