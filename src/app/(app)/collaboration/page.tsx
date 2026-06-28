"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Kanban } from "lucide-react";

export default function CollaborationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Collaboration</h1>
          <p className="text-muted-foreground">Plan together with your team</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Board
        </Button>
      </div>

      <Card>
        <CardContent className="py-16 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-primary/10">
              <Kanban className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Planning Boards</h3>
            <p className="text-muted-foreground max-w-md mx-auto mt-2">
              Create collaborative planning boards to brainstorm, share inspiration, and coordinate events with your fellow RAs and staff.
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Board
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
