"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
            <div>
              <p className="font-semibold text-lg">{session?.user?.name || "User"}</p>
              <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
              <Badge variant="secondary" className="mt-1">
                {session?.user?.role?.replace(/_/g, " ") || "RESIDENT ASSISTANT"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Preference settings will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
