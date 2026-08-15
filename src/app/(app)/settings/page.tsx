"use client";

import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { User, Mail, Shield, Moon } from "lucide-react";
import { PageHeader, SectionMarker } from "@/components/wayfinding/PageChrome";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const isDark = theme === "dark";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl"
    >
      <PageHeader
        code="✦ · SETTINGS"
        title="Settings"
        subtitle="The control panel — manage your account and the fixtures of your workspace."
      />

      {/* ---- Name-plate ---- */}
      <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-card p-6 mb-10">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-lg border border-black/[0.1] dark:border-white/[0.12] bg-[hsl(var(--sage)/0.1)] flex items-center justify-center text-2xl font-display text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]">
            {session?.user?.name?.charAt(0) || "U"}
          </div>
          <div>
            <p className="font-display text-xl leading-tight">{session?.user?.name || "User"}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{session?.user?.email}</p>
            <Badge className="mt-2 bg-primary/15 text-primary border-primary/20">
              {session?.user?.role?.replace(/_/g, " ") || "RESIDENT ASSISTANT"}
            </Badge>
          </div>
        </div>
      </div>

      {/* ---- Account details ---- */}
      <div className="mb-10">
        <SectionMarker code="01" label="Account details" />
        <div className="rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] bg-card">
          <div className="flex items-center gap-4 p-4">
            <User className="h-4 w-4 text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]" strokeWidth={1.75} />
            <div className="flex-1 min-w-0">
              <p className="wayfinding text-muted-foreground">Name</p>
              <p className="text-sm font-medium mt-0.5 truncate">{session?.user?.name || "Not set"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rule">
            <Mail className="h-4 w-4 text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]" strokeWidth={1.75} />
            <div className="flex-1 min-w-0">
              <p className="wayfinding text-muted-foreground">Email</p>
              <p className="text-sm font-medium mt-0.5 truncate">{session?.user?.email || "Not set"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rule">
            <Shield className="h-4 w-4 text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]" strokeWidth={1.75} />
            <div className="flex-1 min-w-0">
              <p className="wayfinding text-muted-foreground">Role</p>
              <p className="text-sm font-medium mt-0.5">{session?.user?.role?.replace(/_/g, " ") || "Resident Assistant"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Preferences / fixtures ---- */}
      <div>
        <SectionMarker code="02" label="Preferences" />
        <div className="rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] bg-card">
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-full flex items-center justify-between gap-4 p-4 hover:bg-[hsl(var(--sage)/0.06)] transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <Moon className="h-4 w-4 text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]" strokeWidth={1.75} />
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground mt-0.5">{isDark ? "Currently active" : "Currently off"}</p>
              </div>
            </div>
            <div className={`h-6 w-10 rounded-full relative transition-colors ${isDark ? "bg-primary/30 border border-primary/50" : "bg-black/10 border border-black/20"}`}>
              <div className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${isDark ? "right-0.5 bg-primary" : "left-0.5 bg-gray-400"}`} />
            </div>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
