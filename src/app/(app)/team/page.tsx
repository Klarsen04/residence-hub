"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Lightbulb, Palette, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader, SectionMarker, EmptyPlate } from "@/components/wayfinding/PageChrome";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const roleColors: Record<string, string> = {
  ADMIN: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  RESIDENT_ASSISTANT: "bg-primary/15 text-primary border-primary/20",
  RHA_MEMBER: "bg-accent/15 text-accent border-accent/20",
  PEER_SUCCESS_GUIDE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  PEER_HEALTH_EDUCATOR: "bg-accent/15 text-accent border-accent/20",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function TeamPage() {
  const { data: members, isLoading } = useSWR("/api/team", fetcher);

  const allMembers = members || [];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-6xl">
      <motion.div variants={item}>
        <PageHeader
          code="G · TEAM"
          title="Team Directory"
          subtitle="The people keeping the building running — your residence life staff, by name-plate."
        />
      </motion.div>

      {isLoading ? (
        <div className="grid gap-px bg-black/[0.08] dark:bg-white/[0.08] rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-card animate-pulse" />
          ))}
        </div>
      ) : allMembers.length === 0 ? (
        <EmptyPlate
          code="G · EMPTY"
          title="No team members found"
          hint="Staff name-plates will appear here as people join the building."
          icon={<Users className="h-7 w-7" strokeWidth={1.5} />}
        />
      ) : (
        <>
          <motion.div variants={item}>
            <SectionMarker
              code="G"
              label="On staff"
              right={<span className="wayfinding text-muted-foreground">{allMembers.length} listed</span>}
            />
          </motion.div>

          <motion.div
            variants={item}
            className="grid gap-px bg-black/[0.08] dark:bg-white/[0.08] rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] sm:grid-cols-2 lg:grid-cols-3"
          >
            {allMembers.map((member: any) => (
              <div key={member.id} className="group bg-card p-6 hover:bg-[hsl(var(--sage)/0.06)] transition-colors">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg border border-black/[0.1] dark:border-white/[0.12] bg-[hsl(var(--sage)/0.1)] flex items-center justify-center font-display text-xl text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]">
                    {member.name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg leading-tight truncate">{member.name || "Unnamed"}</h3>
                    <Badge className={`mt-1.5 ${roleColors[member.role] || "bg-black/[0.06] dark:bg-white/[0.06] text-muted-foreground"}`}>
                      {member.role?.replace(/_/g, " ")}
                    </Badge>
                    {member.hall && (
                      <p className="wayfinding text-muted-foreground mt-2">{member.hall.name}</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 rule flex items-center gap-5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]" strokeWidth={1.75} />
                    <span className="tabular-nums">{member._count?.organizedEvents || 0}</span> events
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]" strokeWidth={1.75} />
                    <span className="tabular-nums">{member._count?.inspirations || 0}</span> ideas
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5 text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]" strokeWidth={1.75} />
                    <span className="tabular-nums">{member._count?.decorations || 0}</span> decs
                  </div>
                </div>

                {member.email && (
                  <a
                    href={`mailto:${member.email}`}
                    className="flex items-center gap-2 mt-3 text-xs text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))] hover:opacity-70 transition-opacity truncate"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{member.email}</span>
                  </a>
                )}
              </div>
            ))}
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
