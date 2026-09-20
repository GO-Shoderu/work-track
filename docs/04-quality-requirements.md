# Quality Requirements

## 1. Purpose

This document defines the quality requirements, also known as non-functional requirements, for the Mini Applicant Tracking System (ATS).

While the Functional Requirements describe **what the system must do**, these Quality Requirements describe **how well the system must behave**.

The requirements in this document focus on:

- Security
- Performance
- Reliability
- Usability
- Accessibility
- Maintainability
- Privacy
- AI Safety

Each requirement is assigned a unique identifier so that it can later be referenced during implementation, testing, security reviews, and demonstrations.

---

# 2. Security Requirements

Security is treated as a first-class requirement throughout the design and implementation of the system.

---

## QR-SEC-001 — Tenant Isolation

A Customer shall never be able to read, modify, or delete data belonging to another Customer organisation.

This applies to:

- Jobs
- Candidates
- Applications
- CVs
- AI assessments
- Organisation-specific data

### Verification

```text
Given:
Customer A is authenticated.

When:
Customer A attempts to access a Candidate belonging to Customer B.

Expected:
The request is denied or no record is returned.
