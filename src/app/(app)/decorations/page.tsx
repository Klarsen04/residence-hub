"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, DoorOpen, LayoutGrid, Ruler } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const typeFilters = [
  { value: "ALL", label: "All", icon: LayoutGrid },
  { value: "DOOR_DECORATION", label: "Door Decs", icon: DoorOpen },
  { value: "BULLETIN_BOARD", label: "Bulletin Boards", icon: LayoutGrid },
  { value: "HALLWAY_DECORATION", label: "Hallway", icon: Ruler },
];

const categoryFilters = [
  "ALL", "WELCOME_WEEK", "MIDTERMS", "FINALS", "MENTAL_HEALTH",
  "HOLIDAYS", "HERITAGE_MONTHS", "LEADERSHIP", "ACADEMIC_SUCCESS",
];

export default function DecorationsPage() {
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const { data: decorations } = useSWR("/api/decorations", fetcher);

  const filtered = (decorations || []).filter((d: any) => {
    if (typeFilter !== "ALL" && d.type !== typeFilter) return false;
    if (categoryFilter !== "ALL" && d.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Decoration Hub</h1>
          <p className="text-muted-foreground">Templates, ideas, and materials for your spaces</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Decoration
        </Button>
      </div>

      <div className="flex gap-2">
        {typeFilters.map((t) => (
          <Button
            key={t.value}
            variant={typeFilter === t.value ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter(t.value)}
          >
            <t.icon className="h-4 w-4 mr-1" />
            {t.label}
          </Button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {categoryFilters.map((c) => (
          <Button
            key={c}
            variant={categoryFilter === c ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setCategoryFilter(c)}
          >
            {c === "ALL" ? "All" : c.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No decorations found. Add some to share!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((dec: any) => (
            <Card key={dec.id} className="overflow-hidden hover:shadow-md transition-shadow">
              {dec.imageUrl && (
                <div className="aspect-[4/3] bg-muted">
                  <img src={dec.imageUrl} alt={dec.title} className="w-full h-full object-cover" />
                </div>
              )}
              <CardContent className="p-4">
                <h3 className="font-semibold">{dec.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{dec.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline">{dec.type.replace(/_/g, " ")}</Badge>
                  <Badge variant="secondary">{dec.category.replace(/_/g, " ")}</Badge>
                </div>
                {dec.costEstimate && (
                  <p className="text-sm text-muted-foreground mt-2">
                    ~${dec.costEstimate.toFixed(2)}
                  </p>
                )}
                {dec.materials?.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {dec.materials.length} materials needed
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
