"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Residence Hub</CardTitle>
          <CardDescription className="text-base mt-2">
            The central operating system for residence life programming
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full h-12 text-base"
            onClick={() => signIn("azure-ad", { callbackUrl: "/dashboard" })}
          >
            Sign in with Microsoft
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Use your university Microsoft account to sign in
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
