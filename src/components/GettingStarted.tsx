"use client";

import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import Link from "next/link";
import { Calendar, Lightbulb, Users, Home, CheckCircle2, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const steps = [
  {
    id: "events",
    title: "Create your first event",
    description: "Plan a program for your residents",
    href: "/events/templates",
    icon: Calendar,
    color: "from-purple-500 to-indigo-500",
  },
  {
    id: "roster",
    title: "Set up your floor roster",
    description: "Add your residents' info",
    href: "/residents",
    icon: Home,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "inspiration",
    title: "Save some inspiration",
    description: "Bookmark event ideas from Pinterest, YouTube, etc.",
    href: "/inspiration",
    icon: Lightbulb,
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "team",
    title: "Check your team",
    description: "See who else is on staff",
    href: "/team",
    icon: Users,
    color: "from-emerald-500 to-teal-500",
  },
];

export function GettingStarted() {
  const [dismissed, setDismissed] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);

  if (dismissed || completed.length === steps.length) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
        <Card className="overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.03] to-blue-500/[0.03]" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Getting Started</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{completed.length}/{steps.length} complete</p>
              </div>
              <button
                onClick={() => setDismissed(true)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] dark:hover:bg-white/[0.06] transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {steps.map((step) => {
                const isComplete = completed.includes(step.id);
                const Icon = step.icon;
                return (
                  <Link
                    key={step.id}
                    href={step.href}
                    onClick={() => !isComplete && setCompleted([...completed, step.id])}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                      isComplete
                        ? "bg-emerald-500/[0.05] border border-emerald-500/20"
                        : "border border-white/[0.06] dark:border-white/[0.06] hover:border-purple-500/20 hover:bg-purple-500/[0.03]"
                    }`}
                  >
                    {isComplete ? (
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      </div>
                    ) : (
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${step.color}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isComplete ? "line-through text-muted-foreground" : ""}`}>{step.title}</p>
                      <p className="text-[11px] text-muted-foreground">{step.description}</p>
                    </div>
                    {!isComplete && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
