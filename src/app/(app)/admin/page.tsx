"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Check, Shield } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const roles = [
  { value: "RESIDENT_ASSISTANT", label: "Resident Assistant" },
  { value: "RHA_MEMBER", label: "RHA Member" },
  { value: "PEER_SUCCESS_GUIDE", label: "Peer Success Guide" },
  { value: "PEER_HEALTH_EDUCATOR", label: "Peer Health Educator" },
  { value: "ADMIN", label: "Administrator" },
];

export default function AdminPage() {
  const { data: session } = useSession();
  const { data: codes, mutate } = useSWR("/api/admin/codes", fetcher);
  const [generating, setGenerating] = useState(false);
  const [selectedRole, setSelectedRole] = useState("RESIDENT_ASSISTANT");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    try {
      const res = await fetch("/api/admin/repair-db", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(
        `Database synced — ${data.tables} tables checked, ${data.columnsAdded} columns added.`
      );
    } catch (e: any) {
      toast.error(e.message || "Repair failed");
    } finally {
      setRepairing(false);
    }
  };

  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">You do not have permission to access this page.</p>
      </div>
    );
  }

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole, expiresInDays: 30 }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      toast.success("Authorization code generated!");
      mutate();
    } catch {
      toast.error("Failed to generate code");
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="text-muted-foreground">Manage authorization codes for new staff</p>
        </div>
      </div>

      {/* Database sync — creates any missing tables/columns in production Turso.
          Safe to run anytime; fixes "Failed to load" pages after schema changes. */}
      <Card>
        <CardHeader>
          <CardTitle>Database</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-muted-foreground max-w-md">
            Sync the database schema. Run this if a page shows &quot;Failed to load&quot; — it
            creates any missing tables and columns. Safe and idempotent.
          </p>
          <Button onClick={handleRepair} disabled={repairing}>
            {repairing ? "Syncing…" : "Sync database"}
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-orange-500/[0.03]" />
        <CardHeader className="relative">
          <CardTitle>Generate Authorization Code</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <select
                className="mt-1.5 flex h-10 w-full rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.03] px-4 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary/30 outline-none"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <Button onClick={handleGenerate} disabled={generating}>
              <Plus className="h-4 w-4 mr-2" />
              {generating ? "Generating..." : "Generate Code"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Codes expire after 30 days and can only be used once.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Authorization Codes</CardTitle>
        </CardHeader>
        <CardContent>
          {!codes || codes.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No codes generated yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {codes.map((code: any) => (
                <div key={code.id} className="flex items-center justify-between p-4 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-3">
                    <code className="font-mono text-base font-bold tracking-wider text-foreground">{code.code}</code>
                    <Badge variant={code.usedBy ? "secondary" : "default"}>
                      {code.usedBy ? "Used" : "Available"}
                    </Badge>
                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20">{code.role.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {code.expiresAt && (
                      <span className="text-xs text-muted-foreground">
                        Expires {new Date(code.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                    {!code.usedBy && (
                      <Button variant="ghost" size="icon" onClick={() => copyCode(code.id, code.code)} className="rounded-xl">
                        {copiedId === code.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
