// Residence-life incident tracks + campus resources, modeled on NYIT (New York
// Tech). NYIT routes reporting through Maxient with distinct tracks; we mirror
// that structure. Phone numbers / offices are NYIT's published contacts.

export interface IncidentTrack {
  key: string;
  label: string;
  description: string;
  // Where a real report routes (external form or office).
  routeTo: string;
  reportUrl?: string;
}

export const INCIDENT_TRACKS: IncidentTrack[] = [
  {
    key: "general",
    label: "General Incident",
    description: "Noise, guest/visitation, prohibited items, vandalism, policy violations.",
    routeTo: "Dean of Students / Residence Life",
    reportUrl: "https://cm.maxient.com/reportingform.php?NYInstTech&layout_id=0",
  },
  {
    key: "student_of_concern",
    label: "Student of Concern",
    description: "Wellness, mental-health, or behavioral concern about a resident.",
    routeTo: "Counseling & Wellness + Dean of Students",
    reportUrl: "https://cm.maxient.com/reportingform.php?NYInstTech&layout_id=1",
  },
  {
    key: "title_ix",
    label: "Sexual Misconduct / Title IX",
    description: "Sexual harassment, assault, or gender-based misconduct.",
    routeTo: "Title IX Coordinator",
    reportUrl: "https://cm.maxient.com/reportingform.php?NYInstTech&layout_id=3",
  },
  {
    key: "substance",
    label: "Alcohol / Drugs",
    description: "Alcohol or controlled-substance policy violations.",
    routeTo: "Dean of Students / Residence Life",
    reportUrl: "https://cm.maxient.com/reportingform.php?NYInstTech&layout_id=0",
  },
  {
    key: "facilities",
    label: "Maintenance / Safety Hazard",
    description: "Facilities emergencies, fire-safety hazards, damage.",
    routeTo: "Residence Life / Facilities",
  },
];

export interface CampusResource {
  name: string;
  detail: string;
  phone?: string;
  email?: string;
  url?: string;
  emergency?: boolean;
}

export const CAMPUS_RESOURCES: CampusResource[] = [
  {
    name: "Campus Security (Long Island)",
    detail: "24/7 public safety — call 911 first in an emergency",
    phone: "516.686.7789",
    url: "https://www.nyit.edu/student-life/campus-safety",
    emergency: true,
  },
  {
    name: "Campus Security (New York City)",
    detail: "24/7 public safety — call 911 first in an emergency",
    phone: "646.273.7789",
    emergency: true,
  },
  {
    name: "Dean of Students",
    detail: "Conduct, incidents, student support",
    phone: "516.686.7635",
    email: "DeanofStudents@nyit.edu",
  },
  {
    name: "Counseling & Wellness Center",
    detail: "Free & confidential — LI 516.686.7703 · NYC 212.261.1770",
    email: "counseling@nyit.edu",
    url: "https://www.nyit.edu/student-life/counseling-and-wellness/",
  },
  {
    name: "Title IX Office",
    detail: "Emily Whearty, Esq., Coordinator · Tower House Rm 106",
    phone: "516.686.1080",
    email: "titleix@nyit.edu",
    url: "https://www.nyit.edu/about/title_ix",
  },
  {
    name: "Residence Life Office",
    detail: "Housing, policies, community standards",
    url: "https://www.nyit.edu/student-life/residence_life",
  },
  {
    name: "Tech Safe App",
    detail: "Report tips, walking companion, emergency contact",
    url: "https://www.nyit.edu/emergency/tech_safe_app",
  },
];
