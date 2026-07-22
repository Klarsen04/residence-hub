"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ChevronLeft, ChevronRight, Moon, Sun, Clock } from "lucide-react";
import { motion } from "framer-motion";

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DutyShift {
  id: string;
  date: string;
  ra: string;
  type: "evening" | "overnight" | "weekend";
  notes?: string;
}

const generateWeekDates = (startOfWeek: Date) => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });
};

const mockDutySchedule: DutyShift[] = [
  { id: "1", date: "2026-07-21", ra: "You", type: "evening" },
  { id: "2", date: "2026-07-22", ra: "Sarah K.", type: "evening" },
  { id: "3", date: "2026-07-23", ra: "Marcus J.", type: "evening" },
  { id: "4", date: "2026-07-24", ra: "You", type: "overnight" },
  { id: "5", date: "2026-07-25", ra: "Aisha P.", type: "evening" },
  { id: "6", date: "2026-07-26", ra: "You", type: "weekend", notes: "Swap with Marcus next week" },
  { id: "7", date: "2026-07-27", ra: "Sarah K.", type: "weekend" },
];

const typeConfig = {
  evening: { icon: Moon, label: "Evening", color: "bg-purple-500/15 text-purple-400 border-purple-500/20", time: "7 PM - 12 AM" },
  overnight: { icon: Moon, label: "Overnight", color: "bg-blue-500/15 text-blue-400 border-blue-500/20", time: "12 AM - 8 AM" },
  weekend: { icon: Sun, label: "Weekend", color: "bg-amber-500/15 text-amber-400 border-amber-500/20", time: "All Day" },
};

export default function DutyPage() {
  const [currentWeek, setCurrentWeek] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - day);
    return start;
  });

  const weekDates = generateWeekDates(currentWeek);

  const prevWeek = () => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() - 7);
    setCurrentWeek(d);
  };

  const nextWeek = () => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + 7);
    setCurrentWeek(d);
  };

  const getShiftsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return mockDutySchedule.filter(s => s.date === dateStr);
  };

  const today = new Date().toISOString().split("T")[0];
  const myNextDuty = mockDutySchedule.find(s => s.ra === "You" && s.date >= today);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-5xl"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Duty Schedule</h1>
            <p className="text-muted-foreground mt-0.5">Track RA duty nights and shifts</p>
          </div>
        </div>
      </div>

      {myNextDuty && (
        <Card className="border-purple-500/20 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-purple-500/10">
              <Clock className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Your Next Duty</p>
              <p className="text-xs text-muted-foreground">
                {new Date(myNextDuty.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                {" "} — {typeConfig[myNextDuty.type].time}
              </p>
            </div>
            <Badge className={`ml-auto ${typeConfig[myNextDuty.type].color}`}>
              {typeConfig[myNextDuty.type].label}
            </Badge>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-5">
            <Button variant="ghost" size="icon" onClick={prevWeek} className="rounded-xl">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold">
              {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </h2>
            <Button variant="ghost" size="icon" onClick={nextWeek} className="rounded-xl">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date, i) => {
              const dateStr = date.toISOString().split("T")[0];
              const isToday = dateStr === today;
              const shifts = getShiftsForDate(date);

              return (
                <div
                  key={i}
                  className={`p-3 rounded-2xl border transition-all min-h-[120px] ${
                    isToday
                      ? "border-purple-500/30 bg-purple-500/[0.05]"
                      : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="text-center mb-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">{SHORT_DAYS[i]}</p>
                    <p className={`text-lg font-bold ${isToday ? "text-purple-400" : ""}`}>{date.getDate()}</p>
                  </div>

                  <div className="space-y-1.5">
                    {shifts.map((shift) => {
                      const config = typeConfig[shift.type];
                      const isMe = shift.ra === "You";
                      return (
                        <div
                          key={shift.id}
                          className={`p-1.5 rounded-lg text-center ${
                            isMe ? "bg-purple-500/15 border border-purple-500/20" : "bg-white/[0.04] border border-white/[0.06]"
                          }`}
                        >
                          <p className={`text-[10px] font-medium ${isMe ? "text-purple-400" : "text-muted-foreground"}`}>
                            {shift.ra}
                          </p>
                          <p className="text-[9px] text-muted-foreground">{config.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(typeConfig).map(([key, config]) => {
          const Icon = config.icon;
          const count = mockDutySchedule.filter(s => s.ra === "You" && s.type === key).length;
          return (
            <div key={key} className="p-4 rounded-2xl border border-white/[0.08] bg-card/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${config.color.split(" ")[0]}`}>
                  <Icon className="h-4 w-4 text-current" />
                </div>
                <div>
                  <p className="text-sm font-medium">{config.label} Shifts</p>
                  <p className="text-xs text-muted-foreground">{config.time}</p>
                </div>
                <span className="ml-auto text-lg font-bold">{count}</span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
