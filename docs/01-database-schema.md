# Residence Hub — Database Schema

## Entity Relationship Overview

```
User ─────────────────┬── Event (organizer)
 │                    ├── Event (co-organizer, many-to-many)
 │                    ├── BudgetRequest
 │                    ├── Inspiration
 │                    ├── Decoration
 │                    ├── Resource
 │                    ├── VendorReview
 │                    └── Comment
 │
ResidenceHall ────────┬── User (assignment)
 │                    ├── Event
 │                    └── Budget (hall-level)
 │
Event ────────────────┬── Budget
 │                    ├── Attendance
 │                    ├── Photo
 │                    ├── Comment
 │                    └── LearningOutcome
 │
Inspiration ──────────┬── Collection
 │                    ├── Tag (many-to-many)
 │                    └── Favorite
 │
Decoration ───────────┬── Category
 │                    ├── Material
 │                    └── File
 │
Vendor ───────────────┬── VendorReview
                      └── Event (many-to-many)
```

## Models

### Core Identity
- **User** — All platform users with role-based access
- **ResidenceHall** — Physical halls, the top-level organizational unit

### Programming
- **Event** — Central programming unit
- **EventCoOrganizer** — Join table for co-organizers
- **EventPhoto** — Event documentation
- **EventAttendance** — Attendance tracking
- **LearningOutcome** — Educational outcomes per event

### Budgets
- **Budget** — Hall-level budget allocation
- **BudgetRequest** — Per-event budget requests
- **BudgetItem** — Line items within a request
- **Expense** — Actual spending records

### Inspiration
- **Inspiration** — Saved content (URLs + uploads)
- **Collection** — User-curated groups
- **InspirationTag** — Tagging system

### Decorations
- **Decoration** — Templates, examples, files
- **DecorationMaterial** — Supply lists

### Vendors
- **Vendor** — Vendor directory
- **VendorReview** — User reviews

### Resources
- **Resource** — Shared files and templates

### Collaboration
- **Comment** — On events, decorations, resources
- **PlanningBoard** — Collaborative boards
- **PlanningBoardItem** — Items on boards

### AI
- **AIPlannerSession** — Saved AI event planner outputs
