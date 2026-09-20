# Work Track Design System

## Purpose

This document defines the primary visual direction for Work Track.

The approved Figma design is the visual source of truth.

The Figma Make prototype stored under:

`reference/figma-make-prototype/`

is a reference implementation only and must not be treated as the
production architecture.

---

## Product Name

**Work Track**

Work Track is a lightweight Applicant Tracking System for managing:

- Customers
- Jobs
- Candidates
- Applications
- Recruitment pipelines
- AI-assisted CV assessments

---

## Visual Direction

Work Track uses a compact, professional SaaS interface inspired by
information-dense recruiting workspaces.

The interface should feel:

- professional;
- modern;
- restrained;
- information-dense;
- easy to scan;
- calm rather than visually noisy.

---

## Typography

Primary font:

`Inter`

Fallback:

`ui-sans-serif, system-ui, sans-serif`

---

## Core Colours

### Sidebar

`#0D0F14`

### Sidebar Hover

`#181B22`

### Workspace Background

`#F1F2F6`

### Primary Accent / Lime

`#AADE00`

### Primary Accent Hover

`#95C700`

### Subtle Lime

`#E8F9A0`

### Surface / Cards

`#FFFFFF`

### Border

`#E4E6EA`

### Muted Text

`#6B7280`

### Subtle Surface

`#F9FAFB`

---

## Recruitment Stage Colours

### Applied

`#3B82F6`

### Screening

`#8B5CF6`

### Interview

`#F59E0B`

### Offer

`#F97316`

### Hired

`#22C55E`

### Rejected

`#9CA3AF`

Rejected should remain visually secondary to the successful recruitment
pipeline.

---

## Layout Principles

### Application Shell

Authenticated application screens use:

- fixed dark sidebar;
- light workspace;
- compact page headers;
- white content surfaces;
- subtle borders;
- minimal shadows.

### Platform Administration

Platform Owner navigation:

- Overview
- Customers
- Review
- Admins
- Inbox
- Audit
- Settings
- Logout

Delegated Admin navigation:

- Overview
- My Customers
- Inbox
- Settings
- Logout

### Customer Workspace

Customer navigation:

- Overview
- Jobs
- Candidates
- Pipeline
- Settings
- Logout

---

## Admin Customer Context

When an Admin operates within a Customer workspace, the active
organisation context must remain visually obvious.

Example:

`Managing customer workspace: Nordic Technologies`

Provide a clear:

`Return to Platform Administration`

action.

---

## Pipeline

The Pipeline is the primary recruitment workspace.

Stages:

- Applied
- Screening
- Interview
- Offer
- Hired

Rejected is treated as a disqualified/archive state.

The Pipeline should support:

- Candidate-name search;
- Job filtering;
- compact Candidate cards;
- stage counts;
- stage movement;
- Candidate detail inspection;
- horizontal scrolling where required.

Successful stage movement should provide an Undo action instead of
requiring confirmation for every move.

---

## Candidate Experience

Candidate information may include:

- Profile
- Applications
- CV
- AI Assessment
- Activity
- Notes

When opened from the Pipeline, Candidate information should preserve
Pipeline context using a right-side detail panel where practical.

---

## AI Assessment

AI assessment is manually triggered.

Display:

- assessment/match indicator;
- strengths;
- potential gaps;
- supporting evidence;
- summary.

The interface must communicate:

> AI-assisted assessment. Human recruiter judgement is required.

---

## Buttons

Primary actions use the lime accent.

Destructive actions must be visually distinct.

Prefer:

- Disable
- Deactivate
- Archive

over permanent deletion where appropriate.

---

## Prototype Interaction Gaps

The Figma Make prototype contains some visual controls that are not
fully wired.

Known examples include:

- Platform Owner > Customers > New Customer
- Platform Owner > Customer > Assign Admin
- Platform Owner > Customer > Deactivate Organisation
- Platform Owner > Admins > New Admin
- Platform Owner > Admin Profile > Edit Permissions
- Customer > Job Detail > Edit Job
- Candidate > Upload CV

These remain valid production requirements even though they are not
functional in the Figma prototype.

---

## Production Login

The Figma prototype contains demo accounts for prototype testing.

The production login must not expose shared demo credentials publicly.

Production authentication uses normal account credentials through
Supabase Auth.

Demo credentials for assessment may be supplied privately to the
reviewer.

---

## Source of Truth

Order of precedence for UI implementation:

1. Approved Figma Design
2. This document
3. Figma Make reference implementation

The generated Figma Make source code must not override documented
architecture or security decisions.
