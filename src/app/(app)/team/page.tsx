"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Lightbulb, Palette, Mail } from "lucide-react";
import { motion } from "framer-motion";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const roleColors: Record<string, string> = {
  ADMIN: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  RESIDENT_ASSISTANT: "bg-primary/15 text-primary border-primary/20",
  RHA_MEMBER: "bg-accent/15 text-accent border-accent/20",
  PEER_SUCCESS_GUIDE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  PEER_HEALTH_EDUCATOR: "bg-accent/15 text-accent border-accent/20",
};

const roleGradients: Record<string, string> = {
  ADMIN: "from-amber-500 to-orange-500",
  RESIDENT_ASSISTANT: "from-primary to-primary",
  RHA_MEMBER: "from-accent to-[hsl(var(--sage-soft))]",
  PEER_SUCCESS_GUIDE: "from-emerald-500 to-[hsl(var(--sage-soft))]",
  PEER_HEALTH_EDUCATOR: "from-accent to-rose-500",
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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl">
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold">Team Directory</h1>
        <p className="text-muted-foreground mt-1">Your residence life staff</p>
      </motion.div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : allMembers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No team members found</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div variants={item} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allMembers.map((member: any) => {
            const gradient = roleGradients[member.role] || "from-primary to-accent";
            return (
              <Card key={member.id} className="overflow-hidden group hover:border-black/[0.15] dark:hover:border-white/[0.15] hover:-translate-y-0.5">
                <div className={`h-1 bg-gradient-to-r ${gradient}`} />
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/10`}>
                      {member.name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{member.name || "Unnamed"}</h3>
                      <Badge className={`mt-1 ${roleColors[member.role] || "bg-black/[0.06] dark:bg-white/[0.06] text-muted-foreground"}`}>
                        {member.role?.replace(/_/g, " ")}
                      </Badge>
                      {member.hall && (
                        <p className="text-xs text-muted-foreground mt-1.5">{member.hall.name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 text-primary" />
                      {member._count?.organizedEvents || 0} events
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Lightbulb className="h-3 w-3 text-amber-400" />
                      {member._count?.inspirations || 0} ideas
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Palette className="h-3 w-3 text-accent" />
                      {member._count?.decorations || 0} decs
                    </div>
                  </div>

                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="flex items-center gap-2 mt-3 text-xs text-primary hover:text-primary transition-colors"
                    >
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
