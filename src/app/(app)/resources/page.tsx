"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, Download, ExternalLink } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const resourceTypes = [
  "ALL", "EVENT_TEMPLATE", "ICEBREAKER", "MARKETING_EXAMPLE", "ATTENDANCE_TRACKER",
  "CAMPUS_SERVICE", "MENTAL_HEALTH", "ACADEMIC_SUPPORT", "TRAINING_MATERIAL",
];

export default function ResourcesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const { data: resources } = useSWR("/api/resources", fetcher);

  const filtered = (resources || []).filter((r: any) => {
    if (filter !== "ALL" && r.type !== filter) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resources</h1>
          <p className="text-muted-foreground">Templates, guides, and shared materials</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Share Resource
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {resourceTypes.map((t) => (
          <Button
            key={t}
            variant={filter === t ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(t)}
          >
            {t === "ALL" ? "All" : t.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No resources found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((resource: any) => (
            <Card key={resource.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{resource.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {resource.description}
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      {resource.type.replace(/_/g, " ")}
                    </Badge>
                    {resource.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {resource.tags.slice(0, 3).map((tag: string) => (
                          <span key={tag} className="text-xs text-muted-foreground">#{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      {resource.fileUrl && (
                        <a href={resource.fileUrl} className="text-sm text-primary hover:underline flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          Download
                        </a>
                      )}
                      {resource.externalUrl && (
                        <a href={resource.externalUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Shared by {resource.user?.name || "Unknown"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
