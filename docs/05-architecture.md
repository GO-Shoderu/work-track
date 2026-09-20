# System Architecture

## 1. Purpose

This document defines the high-level technical architecture for the Mini Applicant Tracking System (ATS).

The architecture is intentionally designed to support:

- rapid delivery;
- secure multi-tenant access;
- maintainability;
- simple deployment;
- AI-assisted development;
- future extension without unnecessary early complexity.

The system is being developed as an MVP intended to reach a first Customer quickly.

For this reason, the architecture deliberately favours a small number of well-understood components over unnecessary service separation.

---

# 2. Architectural Principles

The system shall follow the following architectural principles:

- Prefer simple architecture over unnecessary abstraction.
- Security shall be treated as a first-class architectural concern.
- Customer organisations shall be isolated from one another.
- Authorization shall not rely solely on frontend logic.
- Backend responsibilities should remain explicit and understandable.
- AI-generated code must remain reviewable and maintainable.
- The architecture shall favour rapid iteration without preventing future growth.
- Managed infrastructure may be used where it meaningfully reduces delivery complexity.
- New infrastructure components shall only be introduced when they solve a demonstrated problem.

---

# 3. Technology Stack

## Application Framework

The application shall use:

```text
Next.js
React
TypeScript
