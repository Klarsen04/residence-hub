"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Copy, ArrowRight, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/wayfinding/PageChrome";

const templates = [
  {
    id: "movie-night",
    title: "Movie Night",
    category: "SOCIAL",
    description: "Screen a movie in the lounge with snacks and blankets",
    duration: "2-3 hours",
    attendance: "15-30",
    budget: "$50-100",
    supplies: ["Projector", "Popcorn", "Blankets", "Hot chocolate"],
    tips: "Poll residents for movie choices beforehand. Start with a short icebreaker.",
  },
  {
    id: "study-break",
    title: "Study Break",
    category: "ACADEMIC_SUCCESS",
    description: "Destress session during midterms/finals with snacks and activities",
    duration: "1-2 hours",
    attendance: "20-40",
    budget: "$30-75",
    supplies: ["Stress balls", "Coloring sheets", "Snacks", "Tea/coffee"],
    tips: "Schedule during peak study hours (8-10 PM). Keep the environment calm.",
  },
  {
    id: "floor-meeting",
    title: "Floor Meeting",
    category: "COMMUNITY_BUILDING",
    description: "Required floor meeting with updates, icebreakers, and Q&A",
    duration: "30-45 min",
    attendance: "Full floor",
    budget: "$0-20",
    supplies: ["Agenda printout", "Candy/snacks", "Sign-in sheet"],
    tips: "Start with a fun icebreaker. Keep it under 30 minutes if possible.",
  },
  {
    id: "wellness-wednesday",
    title: "Wellness Wednesday",
    category: "WELLNESS",
    description: "Weekly wellness program — yoga, meditation, craft therapy, etc.",
    duration: "1 hour",
    attendance: "10-20",
    budget: "$20-50",
    supplies: ["Yoga mats", "Candles", "Calming music", "Journaling supplies"],
    tips: "Vary the activity each week. Partner with Counseling & Wellness.",
  },
  {
    id: "cultural-celebration",
    title: "Cultural Celebration",
    category: "DIVERSITY_INCLUSION",
    description: "Celebrate a cultural heritage month with food, music, and education",
    duration: "2-3 hours",
    attendance: "30-50",
    budget: "$100-200",
    supplies: ["Cultural food", "Decorations", "Music playlist", "Info cards"],
    tips: "Partner with cultural student orgs. Get resident input on what to celebrate.",
  },
  {
    id: "game-tournament",
    title: "Game Tournament",
    category: "SOCIAL",
    description: "Competitive gaming tournament (board games, video games, or sports)",
    duration: "2-4 hours",
    attendance: "15-30",
    budget: "$25-75",
    supplies: ["Games/consoles", "Prizes", "Bracket sheet", "Snacks"],
    tips: "Create a sign-up sheet in advance. Have prizes for 1st/2nd/3rd.",
  },
  {
    id: "career-panel",
    title: "Career Panel / Resume Night",
    category: "CAREER_DEVELOPMENT",
    description: "Professional development with resume reviews or career panelists",
    duration: "1.5-2 hours",
    attendance: "15-25",
    budget: "$30-50",
    supplies: ["Printer for resumes", "Professional development handouts", "Snacks"],
    tips: "Partner with Career Services. Invite alumni or local professionals.",
  },
  {
    id: "diy-craft",
    title: "DIY Craft Night",
    category: "COMMUNITY_BUILDING",
    description: "Hands-on crafting session — painting, jewelry, seasonal crafts",
    duration: "1.5-2 hours",
    attendance: "15-25",
    budget: "$50-100",
    supplies: ["Craft supplies", "Drop cloths", "Paper towels", "Music"],
    tips: "Have extra supplies. Show a tutorial video or demo first.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function EventTemplatesPage() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const applyTemplate = (template: typeof templates[0]) => {
    const params = new URLSearchParams({
      title: template.title,
      category: template.category,
      description: template.description,
    });
    router.push(`/events/new?${params.toString()}`);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl">
      <motion.div variants={item}>
        <Button variant="ghost" size="sm" onClick={() => router.push("/events")} className="mb-4 -ml-2 gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to Events
        </Button>
        <PageHeader
          code="01·T · TEMPLATES"
          title="Program Playbook"
          subtitle="Proven event ideas, ready to lift straight onto the board."
        />
      </motion.div>

      <motion.div
        variants={item}
        className="rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08]"
      >
        {templates.map((template, i) => {
          const isExpanded = expandedId === template.id;

          return (
            <div
              key={template.id}
              className="bg-card border-t border-black/[0.08] dark:border-white/[0.08] first:border-t-0 cursor-pointer transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
              onClick={() => setExpandedId(isExpanded ? null : template.id)}
            >
              <div className="flex items-start gap-5 px-5 py-4">
                <span className="font-mono text-sm text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] tabular-nums mt-1 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-xl">{template.title}</h3>
                    <Badge className="bg-black/[0.06] dark:bg-white/[0.06] text-muted-foreground text-[10px] shrink-0">
                      {template.category.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{template.description}</p>

                  <div className="flex flex-wrap gap-4 mt-3 wayfinding text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{template.duration}</span>
                    <span className="flex items-center gap-1.5"><Users className="h-3 w-3" />{template.attendance}</span>
                    <span className="flex items-center gap-1.5">💰 {template.budget}</span>
                  </div>

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 pt-4 rule space-y-3"
                    >
                      <div>
                        <p className="wayfinding text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))] mb-2">Supplies Needed</p>
                        <div className="flex flex-wrap gap-1.5">
                          {template.supplies.map((s) => (
                            <span key={s} className="text-[11px] bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] px-2 py-0.5 rounded-full text-muted-foreground">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="wayfinding text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))] mb-1">Tips</p>
                        <p className="text-sm text-muted-foreground">{template.tips}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); applyTemplate(template); }}
                        className="mt-2"
                      >
                        <Copy className="h-3 w-3 mr-1.5" />
                        Use This Template
                        <ArrowRight className="h-3 w-3 ml-1.5" />
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
