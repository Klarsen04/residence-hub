"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, ExternalLink, Phone, BookOpen, Heart, Shield, GraduationCap, Users, Utensils } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const resourceTypes = [
  "ALL", "CAMPUS_SERVICE", "MENTAL_HEALTH", "ACADEMIC_SUPPORT",
  "RESIDENCE_LIFE", "EMERGENCY", "DINING_REC", "FINANCIAL_WELLNESS",
  "EVENT_TEMPLATE", "TRAINING_MATERIAL", "SHARED",
];

const typeIcons: Record<string, any> = {
  CAMPUS_SERVICE: BookOpen,
  MENTAL_HEALTH: Heart,
  ACADEMIC_SUPPORT: GraduationCap,
  RESIDENCE_LIFE: Users,
  EMERGENCY: Shield,
  DINING_REC: Utensils,
  FINANCIAL_WELLNESS: BookOpen,
  EVENT_TEMPLATE: BookOpen,
  TRAINING_MATERIAL: BookOpen,
  SHARED: Users,
};

const NYIT_RESOURCES = [
  { title: "Counseling & Wellness", url: "https://www.nyit.edu/student-life/counseling-and-wellness/", type: "MENTAL_HEALTH", description: "Free, confidential counseling for all students" },
  { title: "Community Mental Health Resources", url: "https://www.nyit.edu/student-life/counseling-and-wellness/community-mental-health-resources/", type: "MENTAL_HEALTH", description: "Hotlines, referrals, and crisis resources" },
  { title: "Peer Health Educators", url: "https://www.nyit.edu/student-life/counseling-and-wellness/peer-health-educators/", type: "MENTAL_HEALTH", description: "Peer-led health education and wellness programs" },
  { title: "Suicide & Crisis Lifeline: 988", url: "tel:988", type: "EMERGENCY", description: "24/7 free crisis support — call or text 988" },
  { title: "Campus Security (LI): 516.686.7789", url: "tel:5166867789", type: "EMERGENCY", description: "Long Island campus security emergency line" },
  { title: "Campus Security (NYC): 646.273.7789", url: "tel:6462737789", type: "EMERGENCY", description: "NYC campus security emergency line" },
  { title: "Campus Safety", url: "https://www.nyit.edu/student-life/campus-safety/", type: "EMERGENCY", description: "Safety precautions, Tech Safe app, emergency procedures" },
  { title: "Tech Safe App", url: "https://www.nyit.edu/student-life/campus-safety/tech-safe/", type: "EMERGENCY", description: "Mobile safety app for campus emergencies" },
  { title: "Residence Life", url: "https://www.nyit.edu/student-life/residence-life/", type: "RESIDENCE_LIFE", description: "Main Residence Life page — policies, procedures, resources" },
  { title: "Residence Life Policies & Procedures", url: "https://www.nyit.edu/student-life/residence-life/policies-and-procedures/", type: "RESIDENCE_LIFE", description: "Official policies for residence halls" },
  { title: "What to Bring Checklist", url: "https://www.nyit.edu/student-life/residence-life/what-to-bring-checklist/", type: "RESIDENCE_LIFE", description: "Packing list for new residents" },
  { title: "Peer Success GUIDE Program", url: "https://www.nyit.edu/student-life/support/peer-success-guide-program/", type: "RESIDENCE_LIFE", description: "First-year mentoring and peer support program" },
  { title: "Student Activities & Organizations", url: "https://www.nyit.edu/student-life/activities-and-organizations/", type: "RESIDENCE_LIFE", description: "Clubs, orgs, and leadership opportunities" },
  { title: "Career Success & Experiential Education", url: "https://www.nyit.edu/academics/academic-success/career-success-and-experiential-education/", type: "CAMPUS_SERVICE", description: "Career counseling, internships, job placement" },
  { title: "Handshake (Jobs & Internships)", url: "https://www.nyit.edu/academics/academic-success/career-success-and-experiential-education/handshake/", type: "CAMPUS_SERVICE", description: "Job and internship platform for students" },
  { title: "Student Service Hub", url: "https://www.nyit.edu/students/student-service-hub/", type: "CAMPUS_SERVICE", description: "One-stop shop for student services" },
  { title: "Library", url: "https://www.nyit.edu/library", type: "CAMPUS_SERVICE", description: "Library resources, research help, and study spaces" },
  { title: "Accessibility Services", url: "https://www.nyit.edu/student-life/counseling-and-wellness/accessibility-services/", type: "CAMPUS_SERVICE", description: "Disability accommodations and support services" },
  { title: "Title IX & Gender-Based Misconduct", url: "https://www.nyit.edu/about/policies/title-ix-and-gender-based-misconduct/", type: "CAMPUS_SERVICE", description: "Reporting and support for gender-based issues" },
  { title: "Tutoring Services", url: "https://www.nyit.edu/academics/academic-success/tutoring/", type: "ACADEMIC_SUPPORT", description: "Free tutoring — Learning Center, Math, Writing" },
  { title: "Writing Center", url: "https://www.nyit.edu/academics/academic-success/tutoring/writing-center/", type: "ACADEMIC_SUPPORT", description: "Help with papers, essays, and writing assignments" },
  { title: "Math Resource Center", url: "https://www.nyit.edu/academics/academic-success/tutoring/math-resource-center/", type: "ACADEMIC_SUPPORT", description: "Drop-in math help and tutoring" },
  { title: "Academic Advising", url: "https://www.nyit.edu/academics/academic-success/advising/", type: "ACADEMIC_SUPPORT", description: "Course planning and academic guidance" },
  { title: "Supplemental Instruction", url: "https://www.nyit.edu/academics/academic-success/supplemental-instruction/", type: "ACADEMIC_SUPPORT", description: "Peer-led study sessions for tough courses" },
  { title: "Online Learning Resources", url: "https://www.nyit.edu/academics/academic-success/tutoring/online-learning-resources/", type: "ACADEMIC_SUPPORT", description: "Virtual tutoring and study tools" },
  { title: "Dining Services", url: "https://www.nyit.edu/student-life/dining/", type: "DINING_REC", description: "Dining locations, hours, and meal plans" },
  { title: "Meal Plans", url: "https://www.nyit.edu/student-life/dining/meal-plans/", type: "DINING_REC", description: "Residential and commuter meal plan options" },
  { title: "Catering", url: "https://www.nyit.edu/student-life/dining/catering/", type: "DINING_REC", description: "Catering for events and programs" },
  { title: "Bear Bytes: Food Pantry", url: "https://www.nyit.edu/student-life/support/bear-bytes/", type: "FINANCIAL_WELLNESS", description: "Free food pantry and meal assistance for students in need" },
  { title: "Student Emergency Fund", url: "https://www.nyit.edu/student-life/support/emergency-fund/", type: "FINANCIAL_WELLNESS", description: "Up to $500 for students facing financial emergencies" },
  { title: "Financial Success & Wellness", url: "https://www.nyit.edu/student-life/support/financial-success-and-wellness/", type: "FINANCIAL_WELLNESS", description: "Financial literacy and budgeting programs" },
  { title: "Student Freebies & Discounts", url: "https://www.nyit.edu/student-life/support/financial-success-and-wellness/student-freebies-and-discounts/", type: "FINANCIAL_WELLNESS", description: "Free software, subscriptions, and discounts for students" },
  { title: "Tech Threads", url: "https://www.nyit.edu/student-life/support/tech-threads/", type: "FINANCIAL_WELLNESS", description: "Free professional clothing for interviews and events" },
  { title: "First-Gen College Students", url: "https://www.nyit.edu/student-life/support/first-gen/", type: "CAMPUS_SERVICE", description: "Support and resources for first-generation students" },
  { title: "International Student Support", url: "https://www.nyit.edu/student-life/support/international-student-support/", type: "CAMPUS_SERVICE", description: "Immigration, cultural adjustment, and support services" },
  { title: "Student Veteran Hub", url: "https://www.nyit.edu/student-life/support/veteran-hub/", type: "CAMPUS_SERVICE", description: "Resources and community for student veterans" },
];

export default function ResourcesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const { data: sharedResources, mutate } = useSWR("/api/resources", fetcher);

  const [form, setForm] = useState({
    title: "",
    description: "",
    url: "",
    type: "SHARED",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          externalUrl: form.url,
          type: form.type,
          isPublic: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Resource shared with the team!");
      setShowForm(false);
      setForm({ title: "", description: "", url: "", type: "SHARED" });
      mutate();
    } catch {
      toast.error("Failed to share resource");
    }
  };

  const allResources = [
    ...NYIT_RESOURCES.map((r) => ({ ...r, isNYIT: true, id: r.url })),
    ...((sharedResources || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      url: r.externalUrl || r.fileUrl,
      type: r.type,
      isNYIT: false,
      sharedBy: r.user?.name,
    }))),
  ];

  const filtered = allResources.filter((r) => {
    if (filter !== "ALL") {
      if (filter === "SHARED" && r.isNYIT) return false;
      if (filter !== "SHARED" && r.type !== filter) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      return r.title.toLowerCase().includes(s) || r.description?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resources</h1>
          <p className="text-muted-foreground">NYIT resources and team-shared materials</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Share Resource
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Resource name..."
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">URL</label>
                  <Input
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {resourceTypes.filter((t) => t !== "ALL").map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Share with Team</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((resource) => {
          const Icon = typeIcons[resource.type] || BookOpen;
          return (
            <Card key={resource.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{resource.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {resource.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {resource.type.replace(/_/g, " ")}
                      </Badge>
                      {resource.isNYIT && (
                        <Badge variant="outline" className="text-xs">NYIT</Badge>
                      )}
                      {!resource.isNYIT && resource.sharedBy && (
                        <span className="text-xs text-muted-foreground">by {resource.sharedBy}</span>
                      )}
                    </div>
                    {resource.url && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {resource.url.startsWith("tel:") ? "Call" : "Open"}
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No resources found matching your search.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
