"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Lightbulb, Palette, Mail } from "lucide-react";
import { motion } from "framer-motion";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const roleColors: Record<string, string> = {
  ADMIN: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  RESIDENT_ASSISTANT: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  RHA_MEMBER: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  PEER_SUCCESS_GUIDE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  PEER_HEALTH_EDUCATOR: "bg-pink-500/15 text-pink-400 border-pink-500/20",
};

const roleGradients: Record<string, string> = {
  ADMIN: "from-amber-500 to-orange-500",
  RESIDENT_ASSISTANT: "from-purple-500 to-indigo-500",
  RHA_MEMBER: "from-blue-500 to-cyan-500",
  PEER_SUCCESS_GUIDE: "from-emerald-500 to-teal-500",
  PEER_HEALTH_EDUCATOR: "from-pink-500 to-rose-500",
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
            <div key={i} className="h-48 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
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
            const gradient = roleGradients[member.role] || "from-purple-500 to-blue-500";
            return (
              <Card key={member.id} className="overflow-hidden group hover:border-white/[0.15] hover:-translate-y-0.5">
                <div className={`h-1 bg-gradient-to-r ${gradient}`} />
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/10`}>
                      {member.name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{member.name || "Unnamed"}</h3>
                      <Badge className={`mt-1 ${roleColors[member.role] || "bg-white/[0.06] text-muted-foreground"}`}>
                        {member.role?.replace(/_/g, " ")}
                      </Badge>
                      {member.hall && (
                        <p className="text-xs text-muted-foreground mt-1.5">{member.hall.name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/[0.06]">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 text-purple-400" />
                      {member._count?.organizedEvents || 0} events
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Lightbulb className="h-3 w-3 text-amber-400" />
                      {member._count?.inspirations || 0} ideas
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Palette className="h-3 w-3 text-pink-400" />
                      {member._count?.decorations || 0} decs
                    </div>
                  </div>

                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="flex items-center gap-2 mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors"
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
