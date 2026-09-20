# Functional Requirements

## 1. Purpose

This document defines the functional requirements for the Mini Applicant Tracking System (ATS).

Each requirement is assigned a unique identifier so that it can later be referenced during:

- implementation;
- testing;
- code reviews;
- documentation;
- security reviews;
- demonstrations; and
- future feature planning.

The requirements are grouped according to the major functional areas of the system.

---

## 2. Priority Classification

The following priority labels are used throughout this document.

| Priority | Meaning |
|---|---|
| **CORE** | Explicitly required by the coding challenge or necessary to satisfy a core requirement. |
| **WOW** | A bonus or enhancement that improves the product beyond the minimum required functionality. |
| **SUPPORTING** | Supporting functionality that is not explicitly required but improves usability or completeness. |
| **ASSUMPTION** | A product or domain decision made where the original requirements do not specify the behaviour explicitly. |
| **CORE / EXTRA** | Part of the additional AI task requested in the coding challenge. |

---

# 3. Authentication and Accounts

| ID | Requirement | Priority |
|---|---|---|
| **FR-001** | The system shall allow Customer users to log in using valid credentials. | CORE |
| **FR-002** | The system shall allow Admin users to log in using valid credentials. | CORE |
| **FR-003** | An authenticated Admin shall be able to create Customer accounts. | CORE |
| **FR-004** | An authenticated Admin shall be able to create additional Admin accounts. | CORE |
| **FR-005** | Customer users shall not be able to create Admin accounts. | CORE |
| **FR-006** | A prospective Customer may submit a request for access to the platform. | WOW |
| **FR-007** | An Admin shall be able to review prospective Customer access requests. | WOW |
| **FR-008** | The system shall distinguish between Admin and Customer account roles. | CORE |

---

# 4. Organisations

| ID | Requirement | Priority |
|---|---|---|
| **FR-010** | Every Customer account shall belong to an organisation. | CORE |
| **FR-011** | Customer-owned data shall be associated with the relevant organisation. | CORE |
| **FR-012** | An Admin shall be able to operate within the context of a selected Customer organisation. | CORE |
| **FR-013** | Customer organisations may be archived instead of being permanently deleted. | WOW |
| **FR-014** | A Customer shall only be able to access data belonging to their own organisation. | CORE |
| **FR-015** | An Admin shall be able to access Customer organisations for support and management purposes. | CORE |

---

# 5. Jobs

| ID | Requirement | Priority |
|---|---|---|
| **FR-020** | Customers shall be able to create Jobs they are recruiting for. | CORE |
| **FR-021** | Customers shall be able to view Jobs belonging to their organisation. | CORE |
| **FR-022** | Customers shall be able to edit Jobs belonging to their organisation. | SUPPORTING |
| **FR-023** | Jobs may expose a shareable public URL. | WOW |
| **FR-024** | Public visitors may view Jobs that have been published publicly. | WOW |
| **FR-025** | A Job shall belong to a single Customer organisation. | ASSUMPTION |
| **FR-026** | A Job may have multiple Candidates associated with it through Applications. | CORE |

---

# 6. Candidates

| ID | Requirement | Priority |
|---|---|---|
| **FR-030** | Customers shall be able to manually create Candidate records. | CORE |
| **FR-031** | Candidate profiles shall support profile information such as a LinkedIn URL. | CORE |
| **FR-032** | Candidates shall only be accessible within the Customer organisation that owns the Candidate record. | CORE |
| **FR-033** | Recruiters may upload a Candidate CV. | WOW |
| **FR-034** | Public applicants may submit Candidate information through a public Job page. | WOW |
| **FR-035** | Candidate information may include a name, email address, phone number, LinkedIn URL, and CV. | SUPPORTING |
| **FR-036** | A Candidate shall belong to a Customer organisation. | ASSUMPTION |

---

# 7. Applications

An **Application** represents the relationship between a Candidate and a Job.

This allows a single Candidate to be considered for more than one Job while maintaining a separate recruitment stage for each Job.

| ID | Requirement | Priority |
|---|---|---|
| **FR-040** | A Candidate may be associated with a Job. | CORE |
| **FR-041** | A Candidate may be associated with multiple Jobs. | ASSUMPTION |
| **FR-042** | Each Candidate and Job relationship shall be represented by an Application. | CORE |
| **FR-043** | Each Application shall have a current recruitment stage. | CORE |
| **FR-044** | An Application shall belong to the same organisation as the associated Candidate and Job. | CORE |
| **FR-045** | A Candidate's recruitment stage for one Job shall be independent of their stage for another Job. | ASSUMPTION |

---

# 8. Recruitment Pipeline

| ID | Requirement | Priority |
|---|---|---|
| **FR-050** | Customers shall be able to view Applications in a compact Kanban-style recruitment pipeline. | CORE |
| **FR-051** | Customers shall be able to filter the Kanban view by Job. | CORE |
| **FR-052** | Customers shall be able to filter or search the Kanban view by Candidate name. | CORE |
| **FR-053** | Application stages may be changed using drag-and-drop interaction. | WOW |
| **FR-054** | The Kanban view shall visually group Applications according to their current recruitment stage. | CORE |
| **FR-055** | Changes to an Application's recruitment stage shall persist after the page is refreshed. | CORE |
| **FR-056** | Candidate-name filtering and Job filtering may be used together. | ASSUMPTION |

---

# 9. Recruitment Stages

The coding challenge does not prescribe specific recruitment stages.

The following default stages are assumed for the MVP:

1. Applied
2. Screening
3. Interview
4. Offer
5. Hired
6. Rejected

| ID | Requirement | Priority |
|---|---|---|
| **FR-057** | Every Application shall have exactly one current recruitment stage. | CORE |
| **FR-058** | Newly created Applications shall initially enter the `Applied` stage unless otherwise specified. | ASSUMPTION |
| **FR-059** | Recruiters shall be able to move Applications between recruitment stages. | SUPPORTING |

---

# 10. Administration

| ID | Requirement | Priority |
|---|---|---|
| **FR-060** | Admins shall be able to perform Customer operations on behalf of a selected Customer organisation. | CORE |
| **FR-061** | Sensitive administrative actions may be recorded in an audit log. | WOW |
| **FR-062** | Accounts may be disabled without permanently deleting them. | WOW |
| **FR-063** | Customer organisations may be archived without permanently deleting their recruitment data. | WOW |
| **FR-064** | An Admin shall be able to clearly identify which Customer organisation they are currently managing. | SUPPORTING |
| **FR-065** | Admin-only functionality shall not be available to Customer users. | CORE |

---

# 11. Customer Access Requests

This section covers the optional Customer onboarding workflow.

| ID | Requirement | Priority |
|---|---|---|
| **FR-080** | A prospective Customer may submit an access request without having an account. | WOW |
| **FR-081** | An access request may contain organisation and contact information. | WOW |
| **FR-082** | An access request may contain a contact person's name, email address, phone number, website, and additional notes. | WOW |
| **FR-083** | Admins shall be able to review submitted access requests. | WOW |
| **FR-084** | An Admin may approve or reject an access request. | WOW |
| **FR-085** | An approved access request may result in the creation of a Customer organisation and Customer account. | WOW |

---

# 12. Public Job Applications

This section covers the optional public recruitment workflow.

| ID | Requirement | Priority |
|---|---|---|
| **FR-090** | A Customer may publish a Job using a shareable public link. | WOW |
| **FR-091** | A public visitor may view the details of a published Job without logging in. | WOW |
| **FR-092** | A Candidate may submit an application through a public Job page without creating an account. | WOW |
| **FR-093** | A public Job application may include Candidate profile information and a CV. | WOW |
| **FR-094** | A successful public application shall create or associate the relevant Candidate record with the Job. | WOW |
| **FR-095** | A successful public application shall create an Application in the recruitment pipeline. | WOW |
| **FR-096** | A newly submitted public Application shall initially enter the `Applied` stage. | WOW |

---

# 13. AI-Assisted CV Assessment

The AI assessment feature is an additional task included in the coding challenge.

The purpose of the feature is to assist recruiters by comparing information contained in a Candidate's CV against the requirements of a relevant Job.

| ID | Requirement | Priority |
|---|---|---|
| **FR-070** | The system shall support AI-assisted assessment of a Candidate's CV. | CORE / EXTRA |
| **FR-071** | The AI assessment shall consider Candidate evidence in relation to the relevant Job. | CORE / EXTRA |
| **FR-072** | The AI assessment may return structured information such as strengths, gaps, supporting evidence, a summary, and a match score. | WOW |
| **FR-073** | AI assessment shall not automatically reject Candidates or make final hiring decisions. | ASSUMPTION |
| **FR-074** | AI assessment results shall be presented as decision-support information for a human recruiter. | ASSUMPTION |
| **FR-075** | The AI assessment shall focus on Job-relevant Candidate information. | ASSUMPTION |

---

# 14. Candidate CV Management

| ID | Requirement | Priority |
|---|---|---|
| **FR-100** | Recruiters may attach a CV to a Candidate profile. | WOW |
| **FR-101** | A Candidate CV shall remain associated with the relevant Candidate. | WOW |
| **FR-102** | Authorised users may access a Candidate's stored CV. | WOW |
| **FR-103** | Unauthorised users shall not be able to access Candidate CV files. | WOW |

---

# 15. Auditability

| ID | Requirement | Priority |
|---|---|---|
| **FR-110** | The system may record significant administrative actions in an audit log. | WOW |
| **FR-111** | Audit records may identify the user who performed an action. | WOW |
| **FR-112** | Audit records may identify the action performed and the affected resource. | WOW |
| **FR-113** | Audit records may contain a timestamp for the action. | WOW |

Examples of auditable actions may include:

- creation of an Admin account;
- creation of a Customer account;
- disabling an account;
- archiving an organisation;
- creating a Job on behalf of a Customer;
- modifying recruitment data on behalf of a Customer.

---

# 16. Account Lifecycle

| ID | Requirement | Priority |
|---|---|---|
| **FR-120** | User accounts may support active and disabled states. | WOW |
| **FR-121** | Disabled users shall not be able to access the platform. | WOW |
| **FR-122** | Customer organisations may support active, suspended, or archived states. | WOW |
| **FR-123** | Archiving an organisation should preserve its existing recruitment data. | WOW |

Permanent destructive deletion of Customer organisations is outside the initial MVP scope.

---

# 17. Requirement Traceability

Requirement IDs shall be used throughout the project where appropriate.

Examples include:

```text
Implementation:
FR-050 — Kanban recruitment pipeline

Testing:
TEST-FR-050 — Verify Applications appear in the correct Kanban column

Security Review:
FR-032 — Verify Customer A cannot access Customer B's Candidates

Demo:
FR-051 — Demonstrate filtering Pipeline by Job
