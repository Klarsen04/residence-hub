"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { User, Mail, Shield, Moon, Bell } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);

  const isDark = theme === "dark";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-2xl mx-auto"
    >
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-primary/20">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
            <div>
              <p className="font-semibold text-lg">{session?.user?.name || "User"}</p>
              <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
              <Badge className="mt-2 bg-primary/15 text-primary border-primary/20">
                {session?.user?.role?.replace(/_/g, " ") || "RESIDENT ASSISTANT"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-sm font-medium">{session?.user?.name || "Not set"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
            <div className="p-2 rounded-lg bg-accent/10">
              <Mail className="h-4 w-4 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{session?.user?.email || "Not set"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Shield className="h-4 w-4 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="text-sm font-medium">{session?.user?.role?.replace(/_/g, " ") || "Resident Assistant"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Moon className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">{isDark ? "Currently active" : "Currently off"}</p>
              </div>
            </div>
            <div className={`h-6 w-10 rounded-full relative transition-colors ${isDark ? "bg-primary/30 border border-primary/50" : "bg-black/10 border border-black/20"}`}>
              <div className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${isDark ? "right-0.5 bg-primary" : "left-0.5 bg-gray-400"}`} />
            </div>
          </button>
          <button
            onClick={() => setNotifications(!notifications)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Bell className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Notifications</p>
                <p className="text-xs text-muted-foreground">Event reminders & updates</p>
              </div>
            </div>
            <div className={`h-6 w-10 rounded-full relative transition-colors ${notifications ? "bg-primary/30 border border-primary/50" : "bg-black/10 dark:bg-white/10 border border-black/20 dark:border-white/20"}`}>
              <div className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${notifications ? "right-0.5 bg-primary" : "left-0.5 bg-gray-400"}`} />
            </div>
          </button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
