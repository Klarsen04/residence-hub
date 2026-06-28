"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Star, Globe, Phone, Mail } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const vendorCategories = [
  "ALL", "CATERING", "ENTERTAINMENT", "PRINTING", "DECORATIONS", "PHOTOGRAPHY", "CRAFT_SUPPLIES", "OTHER",
];

export default function VendorsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const { data: vendors } = useSWR("/api/vendors", fetcher);

  const filtered = (vendors || []).filter((v: any) => {
    if (filter !== "ALL" && v.category !== filter) return false;
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const avgRating = (reviews: any[]) => {
    if (!reviews?.length) return null;
    return (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendors</h1>
          <p className="text-muted-foreground">Find and review local vendors for events</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {vendorCategories.map((c) => (
          <Button
            key={c}
            variant={filter === c ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(c)}
          >
            {c === "ALL" ? "All" : c.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No vendors found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((vendor: any) => {
            const rating = avgRating(vendor.reviews);
            return (
              <Card key={vendor.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{vendor.name}</h3>
                      <Badge variant="secondary" className="mt-1">
                        {vendor.category.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    {rating && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-sm font-medium">{rating}</span>
                      </div>
                    )}
                  </div>
                  {vendor.costRange && (
                    <p className="text-sm text-muted-foreground mt-2">{vendor.costRange}</p>
                  )}
                  <div className="mt-3 space-y-1">
                    {vendor.website && (
                      <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <Globe className="h-3 w-3" />
                        Website
                      </a>
                    )}
                    {vendor.phone && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {vendor.phone}
                      </p>
                    )}
                    {vendor.email && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {vendor.email}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Used in {vendor._count?.events || 0} events
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
