"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SUBMITTED: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  DENIED: "bg-red-100 text-red-700",
  COMPLETED: "bg-blue-100 text-blue-700",
};

export default function BudgetsPage() {
  const { data } = useSWR("/api/budgets", fetcher);
  const requests = data?.requests || [];
  const hallBudget = data?.hallBudget;

  const budgetPercent = hallBudget
    ? (hallBudget.used / hallBudget.allocated) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Budgets</h1>
          <p className="text-muted-foreground">Track spending and submit budget requests</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {hallBudget && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Hall Budget — {hallBudget.semester}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Used: {formatCurrency(hallBudget.used)}</span>
              <span>Allocated: {formatCurrency(hallBudget.allocated)}</span>
            </div>
            <Progress value={budgetPercent} />
            <p className="text-sm font-medium text-primary">
              {formatCurrency(hallBudget.allocated - hallBudget.used)} remaining
            </p>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">My Requests</h2>
        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No budget requests yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((req: any) => (
              <Card key={req.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{req.title}</h3>
                    {req.event && (
                      <p className="text-sm text-muted-foreground">
                        Event: {req.event.title}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {req.items?.length || 0} items
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatCurrency(req.amount)}</span>
                    <Badge className={statusColors[req.status] || ""}>
                      {req.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
