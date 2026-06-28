# Residence Hub — User Flows

## 1. Authentication

```
Landing Page → "Sign in with Microsoft" → Entra ID → Callback → Dashboard
                                                         ↓
                                              (First login: set role + hall)
```

## 2. Dashboard (Home)

```
Dashboard
├── Upcoming Events (personal + hall)     → Click → Event Detail
├── Budget Snapshot (donut chart)         → Click → Budget Page
├── Inspiration Feed (recent saves)       → Click → Inspiration Detail
└── Resource Feed (recent shares)         → Click → Resource Detail
```

## 3. Event Creation

```
Events Page → "+ New Event" → Event Form
                                 ├── Title, Description, Date/Time, Location
                                 ├── Select Hall
                                 ├── Select Category
                                 ├── Add Co-organizers (search users)
                                 ├── Add Learning Outcomes
                                 └── Attach Budget Request (optional)
                                          ↓
                              Submit → Status: DRAFT or PENDING_APPROVAL
                                          ↓
                              Admin approves → APPROVED
                                          ↓
                              After event → Add Attendance, Photos, Reflection
```

## 4. Budget Request

```
Budgets Page → "+ New Request" → Budget Form
                                    ├── Select Event (optional)
                                    ├── Add Line Items
                                    │    ├── Item name
                                    │    ├── Quantity
                                    │    ├── Unit cost
                                    │    ├── Vendor/URL
                                    │    └── Notes
                                    └── Submit for Approval
                                              ↓
                                    Admin reviews → Approve/Deny
                                              ↓
                                    After purchase → Log Expenses with receipts
```

## 5. Inspiration Flow

```
Inspiration Page → "+ Save Inspiration" → Form
                       ├── Paste URL (Pinterest/Instagram/TikTok/YouTube)
                       ├── OR Upload Image
                       └── AI auto-categorizes
                              ↓
                    Saved → Grid View
                              ├── Filter by Category
                              ├── Search by Tag
                              ├── Add to Collection
                              └── Favorite
```

## 6. Decoration Hub

```
Decorations Page → Browse by Type (Door/Bulletin/Hallway)
                       ├── Filter by Category (Welcome Week, Finals, etc.)
                       ├── View Detail
                       │    ├── Photos/Templates
                       │    ├── Instructions
                       │    ├── Material List + Costs
                       │    └── Comments
                       └── "+ Add Decoration" → Upload Form
```

## 7. AI Event Planner

```
AI Planner Page → Input Form
                    ├── Budget ($)
                    ├── Audience (dropdown)
                    ├── Goal (category dropdown)
                    └── Expected Attendance (#)
                              ↓
                    Generate (streaming response)
                              ↓
                    Results Card
                    ├── Event Concepts (3-5 options)
                    ├── Shopping List with costs
                    ├── Timeline
                    ├── Marketing Plan
                    ├── Setup/Cleanup Checklists
                    └── "Create Event from This" → Pre-fills event form
```

## 8. Vendor Lookup

```
Vendors Page → Search/Filter by Category
                  ├── View Vendor Detail
                  │    ├── Contact info
                  │    ├── Reviews + ratings
                  │    └── Past events used at
                  └── "+ Add Vendor" → Vendor Form
```

## 9. Resource Library

```
Resources Page → Browse by Type (Templates, Support, Training)
                    ├── Search by tags
                    ├── Download/Open file
                    └── "+ Share Resource" → Upload Form
```

## 10. Collaboration

```
Planning Boards → View Boards
                    ├── Create Board → Invite members
                    ├── Add Items (notes, links, inspiration)
                    └── Comment on items
```

## 11. Admin Flows

```
Admin View
├── Pending Events → Approve/Deny
├── Pending Budgets → Approve/Deny
├── User Management → Assign roles, halls
└── Reports → Hall metrics, budget utilization
```
