"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Check } from "lucide-react";
import { toast } from "sonner";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="text-muted-foreground">Manage authorization codes for new staff</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Authorization Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div>
              <label className="text-sm font-medium">Role</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
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
          <p className="text-xs text-muted-foreground mt-2">
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
            <p className="text-sm text-muted-foreground">No codes generated yet</p>
          ) : (
            <div className="space-y-2">
              {codes.map((code: any) => (
                <div key={code.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <code className="font-mono text-lg font-bold tracking-wider">{code.code}</code>
                    <Badge variant={code.usedBy ? "secondary" : "default"}>
                      {code.usedBy ? "Used" : "Available"}
                    </Badge>
                    <Badge variant="outline">{code.role.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {code.expiresAt && (
                      <span className="text-xs text-muted-foreground">
                        Expires {new Date(code.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                    {!code.usedBy && (
                      <Button variant="ghost" size="icon" onClick={() => copyCode(code.id, code.code)}>
                        {copiedId === code.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
