"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, Lightbulb, Users, ArrowUpRight } from "lucide-react";

interface DigestProps {
  eventsCount: number;
  inspirationsCount: number;
}

export function WeeklyDigest({ eventsCount, inspirationsCount }: DigestProps) {
  const totalActivity = eventsCount + inspirationsCount;

  if (totalActivity === 0) return null;

  return (
    <Card className="overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-teal-500/[0.03]" />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-emerald-500/10">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          This Week
          <Badge className="ml-auto bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">
            <ArrowUpRight className="h-3 w-3 mr-0.5" />
            Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-[11px] text-muted-foreground">Events</span>
            </div>
            <p className="text-xl font-bold">{eventsCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[11px] text-muted-foreground">Inspirations</span>
            </div>
            <p className="text-xl font-bold">{inspirationsCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
