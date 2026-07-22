"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, DollarSign, Receipt, TrendingDown, Trash2, Package } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const statusColors: Record<string, string> = {
  DRAFT: "bg-white/[0.06] text-muted-foreground",
  PENDING: "bg-amber-500/15 text-amber-400",
  APPROVED: "bg-emerald-500/15 text-emerald-400",
  DENIED: "bg-red-500/15 text-red-400",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function BudgetPage() {
  const { data: requests, mutate } = useSWR("/api/budget", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    amount: "",
    items: [{ name: "", quantity: "1", unitCost: "", vendor: "" }],
  });

  const allRequests = requests || [];
  const totalRequested = allRequests.reduce((sum: number, r: any) => sum + r.amount, 0);
  const totalApproved = allRequests.filter((r: any) => r.status === "APPROVED").reduce((sum: number, r: any) => sum + r.amount, 0);
  const totalSpent = allRequests.reduce((sum: number, r: any) =>
    sum + (r.expenses?.reduce((s: number, e: any) => s + e.amount, 0) || 0), 0
  );

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { name: "", quantity: "1", unitCost: "", vendor: "" }] });
  };

  const updateItem = (index: number, field: string, value: string) => {
    const items = [...form.items];
    items[index] = { ...items[index], [field]: value };
    setForm({ ...form, items });
  };

  const removeItem = (index: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          amount: form.amount,
          items: form.items.filter(i => i.name.trim()),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Budget request created!");
      setShowForm(false);
      setForm({ title: "", description: "", amount: "", items: [{ name: "", quantity: "1", unitCost: "", vendor: "" }] });
      mutate();
    } catch {
      toast.error("Failed to create request");
    }
  };

  const stats = [
    { label: "Total Requested", value: `$${totalRequested.toFixed(2)}`, icon: DollarSign, color: "from-purple-500 to-indigo-500" },
    { label: "Approved", value: `$${totalApproved.toFixed(2)}`, icon: Receipt, color: "from-emerald-500 to-teal-500" },
    { label: "Spent", value: `$${totalSpent.toFixed(2)}`, icon: TrendingDown, color: "from-amber-500 to-orange-500" },
    { label: "Requests", value: allRequests.length, icon: Package, color: "from-blue-500 to-cyan-500" },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Budget Tracker</h1>
          <p className="text-muted-foreground mt-1">Track event spending and budget requests</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </motion.div>

      <motion.div variants={item} className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-sm p-5 transition-all duration-300 hover:border-white/[0.15]"
          >
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.color} opacity-[0.07] rounded-full blur-2xl -translate-y-4 translate-x-4`} />
            <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${stat.color} mb-3`}>
              <stat.icon className="h-4 w-4 text-white" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-purple-500/20">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Request Title</label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Movie Night Supplies"
                      required
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total Amount ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      placeholder="150.00"
                      required
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief description..."
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-muted-foreground">Line Items</label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>+ Add Item</Button>
                  </div>
                  <div className="space-y-2">
                    {form.items.map((itm, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input value={itm.name} onChange={(e) => updateItem(i, "name", e.target.value)} placeholder="Item name" className="flex-1" />
                        <Input value={itm.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} placeholder="Qty" className="w-16" type="number" />
                        <Input value={itm.unitCost} onChange={(e) => updateItem(i, "unitCost", e.target.value)} placeholder="$" className="w-20" type="number" step="0.01" />
                        <Input value={itm.vendor} onChange={(e) => updateItem(i, "vendor", e.target.value)} placeholder="Vendor" className="w-28" />
                        {form.items.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)} className="shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit">Submit Request</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={item}>
        {allRequests.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <DollarSign className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No budget requests yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create one to track your event spending</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {allRequests.map((req: any) => {
              const spent = req.expenses?.reduce((s: number, e: any) => s + e.amount, 0) || 0;
              const spentPercent = req.amount > 0 ? (spent / req.amount) * 100 : 0;
              return (
                <Card key={req.id} className="hover:border-white/[0.15]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500">
                          <DollarSign className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{req.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {req.description || "No description"}
                            {req.event && ` • ${req.event.title}`}
                          </p>
                          {req.items?.length > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {req.items.length} item{req.items.length > 1 ? "s" : ""}:
                              {" "}{req.items.slice(0, 3).map((i: any) => i.name).join(", ")}
                              {req.items.length > 3 && ` +${req.items.length - 3} more`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${req.amount.toFixed(2)}</p>
                        <Badge className={statusColors[req.status] || statusColors.DRAFT}>
                          {req.status}
                        </Badge>
                      </div>
                    </div>
                    {spent > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/[0.06]">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                          <span>${spent.toFixed(2)} spent</span>
                          <span>{Math.round(spentPercent)}% of budget</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${spentPercent > 90 ? "bg-red-500" : spentPercent > 70 ? "bg-amber-500" : "bg-gradient-to-r from-purple-500 to-blue-500"}`}
                            style={{ width: `${Math.min(spentPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
