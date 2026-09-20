# Work Track — Product Vision and Scope

## 1. Product

**Work Track** is a lightweight multi-tenant Applicant Tracking System (ATS).

It is designed to help organisations manage:

- Jobs
- Candidates
- Applications
- Recruitment pipelines
- Candidate CVs
- AI-assisted Candidate assessments

The product aims to provide a focused recruiting workspace without the complexity of large enterprise HR platforms.

---

# 2. Problem

Small organisations and recruiting teams often manage recruitment using fragmented tools such as:

- spreadsheets;
- email;
- LinkedIn;
- shared documents;
- messaging applications; and
- manual notes.

This makes it difficult to answer simple but important questions such as:

- Which Jobs are currently open?
- Which Candidates are being considered for each Job?
- What stage is each Candidate currently in?
- Which Candidates require attention?
- Where is the Candidate's CV or profile information?
- What recruitment activity has recently occurred?

Work Track brings these activities into one recruitment workspace.

---

# 3. Vision

Provide a simple, secure and professional recruitment workspace where organisations can:

- create Jobs;
- manage Candidates;
- associate Candidates with Jobs;
- visually track Applications through a hiring pipeline; and
- use AI as decision-support during Candidate assessment.

The system should be easy enough for a first Customer to begin using with minimal training while maintaining strong security and organisation isolation.

---

# 4. Primary Goal

Enable a newly onboarded Customer to move from account creation to actively managing recruitment with minimal setup.

A Customer should be able to:

```text
Receive Account
      ↓
Log In
      ↓
Create Job
      ↓
Add Candidate
      ↓
Associate Candidate with Job
      ↓
Application Created
      ↓
Track Application in Pipeline



# 5. Primary Users

## Platform Owner / Administrator

A platform-level user responsible for:

- onboarding Customers;
- creating Customer accounts;
- creating other Admin accounts;
- supporting Customer organisations;
- managing Customer recruitment activity where authorised;
- reviewing Customer access requests; and
- monitoring administrative activity.

The Platform Owner concept is an administrative enhancement to the core Admin role.

---

## Delegated Administrator

An Admin who may be assigned specific Customer organisations or administrative capabilities.

The MVP should avoid introducing unnecessarily complex enterprise permission management.

---

## Customer / Recruiter

An authenticated user belonging to a Customer organisation.

The Recruiter manages:

- Jobs;
- Candidates;
- Applications;
- recruitment stages;
- Candidate CVs; and
- AI-assisted Candidate assessments.

A Customer shall only access data belonging to their own organisation.

---

## Candidate

A Candidate represents a person being considered for a Job.

Candidates are domain entities and do not require authenticated Work Track accounts.

A Candidate may be associated with one or more Jobs through Applications.

---

## Prospective Customer

A person or organisation interested in gaining access to Work Track.

As an enhancement, they may submit an access request for review by an Administrator.

---

# 6. Core Domain Model

The central recruitment relationship is:

```text
Candidate
    +
Job
    =
Application
```

A **Candidate** represents a person.

A **Job** represents a role an organisation is recruiting for.

An **Application** represents a Candidate being considered for a specific Job.

An Application owns the recruitment stage.

This means the same Candidate may be considered for multiple Jobs independently.

Example:

```text
Jane Smith
    │
    ├── Backend Engineer
    │      Stage: Interview
    │
    └── DevOps Engineer
           Stage: Screening
```

---

# 7. Recruitment Pipeline

The default recruitment stages are:

1. Applied
2. Screening
3. Interview
4. Offer
5. Hired
6. Rejected

Rejected is treated as a disqualified or archived recruitment outcome rather than part of the primary successful hiring path.

---

# 8. Product Scope

The current implementation scope is divided into:

- **P0 — Core Features**
- **P1 — WOW Features**

P0 functionality must be completed before optional enhancements are allowed to threaten delivery quality.

---

# 9. P0 — Core Features

These features are required by the coding challenge or are necessary to support an explicitly required capability.

---

## CORE-01 — Admin Authentication

An Admin shall be able to securely authenticate and access Work Track.

---

## CORE-02 — Admin Creates Admin Accounts

An authenticated Admin shall be able to create additional Admin accounts.

---

## CORE-03 — Admin Creates Customer Accounts

An authenticated Admin shall be able to create Customer accounts.

A Customer account shall be associated with a Customer organisation.

---

## CORE-04 — Customer Authentication

A Customer shall be able to securely log into Work Track.

The Customer's role and organisation shall be derived from trusted account information.

Users shall not manually select their role during login.

---

## CORE-05 — Customer Creates Jobs

A Customer shall be able to create Jobs for positions they are recruiting for.

For the Core implementation, creating a Job means creating the recruitment position inside Work Track.

Public publication is an enhancement.

---

## CORE-06 — Customer Creates Candidates

A Customer shall be able to manually add Candidates.

Minimum Candidate information should include:

- Name
- Email
- LinkedIn URL

Additional reasonable information may include:

- Phone number
- Current role
- Location
- Notes

---

## CORE-07 — Candidate and Job Association

A Candidate shall be able to be associated with a Job.

The relationship shall be represented by an Application.

```text
Candidate + Job = Application
```

---

## CORE-08 — Recruitment Pipeline

A Customer shall be able to view Applications through a compact Kanban-style recruitment pipeline.

The Pipeline shall clearly communicate the current recruitment stage of each Application.

---

## CORE-09 — Job Filtering

A Customer shall be able to filter the Pipeline by Job.

---

## CORE-10 — Candidate Name Filtering

A Customer shall be able to search or filter the Pipeline using a Candidate's name.

Candidate-name search and Job filtering may operate together.

---

## CORE-11 — Admin Operates on Behalf of Customer

An Admin shall be able to perform Customer recruitment operations on behalf of an authorised Customer organisation.

Admins shall not use Customer credentials.

Instead, Work Track shall use an explicit organisation context.

Example:

```text
Managing Customer Workspace:
Nordic Technologies
```

The current organisation context must remain visually obvious.

---

## CORE-12 — Live Deployment

Work Track shall be deployed to a live URL for evaluation.

---

## CORE-13 — Admin Demo Access

Admin login credentials shall be supplied privately to the evaluator.

Credentials shall not be committed to the source repository.

---

## CORE-14 — Source Repository

The source repository shall be shared as part of final delivery.

---

## CORE-15 — Demo Video

A demonstration video of approximately five minutes shall be provided.

The demonstration should cover:

- primary user journeys;
- important architectural decisions;
- security considerations;
- AI assessment; and
- relevant implementation trade-offs.

---

## CORE-16 — Delivery Assumptions

Important assumptions made during implementation shall be communicated as part of the final delivery to Jonas.

They do not require a dedicated repository document.

---

## CORE-17 — AI-Assisted CV Assessment

Work Track shall include a simple AI-assisted Candidate CV assessment capability.

The assessment should compare:

```text
Candidate CV
      +
Relevant Job Information
```

and provide Job-relevant decision-support information.

AI shall not autonomously make final hiring decisions.

---

# 10. P1 — WOW Features

These features are agreed enhancements intended to strengthen the product beyond the minimum required implementation.

They should only be implemented when they do not threaten completion, security or quality of Core functionality.

---

## WOW-01 — Customer Access Request

A prospective Customer may submit an access request before receiving an account.

Possible information includes:

- Company name
- Contact person
- Business email
- Phone number
- Website
- Hiring needs
- Preferred contact method
- Additional notes

---

## WOW-02 — Customer Onboarding Review

Admins may review Customer access requests.

Possible actions include:

- Approve
- Request More Information
- Reject

Approval may result in creation of the Customer organisation and Customer account.

---

## WOW-03 — Public Job Page

A Customer may optionally publish a Job through a shareable public URL.

Public publication is not required to create an internal Job.

---

## WOW-04 — Public Candidate Application

A Candidate may apply to a public Job without creating a Work Track account.

A successful submission may create:

```text
Candidate
    +
Application
    +
Stage = Applied
```

---

## WOW-05 — Candidate CV Upload

Recruiters may securely upload Candidate CVs.

Candidate CVs shall use private storage and only be accessible to authorised users.

---

## WOW-06 — Candidate Detail Workspace

Candidate information may be displayed through a detailed workspace or contextual right-side panel.

Possible sections include:

- Profile
- Applications
- CV
- AI Assessment
- Activity
- Notes

When opened from the Pipeline, Candidate details should preserve Pipeline context.

---

## WOW-07 — Drag-and-Drop Pipeline

Recruiters may move Applications between recruitment stages using drag-and-drop.

Successful stage movement should provide an Undo action rather than requiring confirmation for every move.

---

## WOW-08 — Audit Trail

Important administrative activity may be recorded.

Examples include:

- Admin creation
- Customer creation
- Customer context access
- access-request approval
- account deactivation
- recruitment actions performed on behalf of Customers

---

## WOW-09 — Reversible Account Lifecycle

The MVP should prefer reversible states over unnecessary destructive deletion.

Possible User states:

- Active
- Disabled

Possible Organisation states:

- Active
- Suspended
- Archived

---

## WOW-10 — Evidence-Based AI Assessment

The AI assessment may provide structured output including:

- Match indicator
- Strengths
- Potential gaps
- Supporting evidence
- Summary

The interface should clearly communicate:

> AI-assisted assessment. Human recruiter judgement is required.

---

# 11. Explicitly Out of Scope

The current implementation does not require:

- Candidate accounts
- Candidate portal
- Calendar integration
- Interview scheduling
- Payroll
- Employee management
- Leave management
- Performance management
- Billing
- Subscriptions
- SSO
- Offer-letter generation
- Contract management
- complex analytics dashboards
- advanced enterprise RBAC
- recruitment workflow automation
- external Job-board integrations

These capabilities may be considered in a future product iteration but are not part of the current coding challenge.

---

# 12. Success Criteria

The Core product is considered functionally complete when the following journey succeeds:

```text
Admin Logs In
      ↓
Admin Creates Customer
      ↓
Customer Logs In
      ↓
Customer Creates Job
      ↓
Customer Adds Candidate
      ↓
Candidate Is Associated with Job
      ↓
Application Appears in Pipeline
      ↓
Application Stage Can Be Managed
      ↓
Pipeline Can Be Filtered by Job
      ↓
Pipeline Can Be Searched by Candidate Name
      ↓
Admin Can Manage Customer Recruitment Data
      ↓
AI CV Assessment Can Be Demonstrated
      ↓
Application Is Live
```

All operations must respect the documented security and organisation-isolation requirements.

---

# 13. Scope Control

New feature ideas shall not automatically become implementation requirements.

During the current delivery, priority shall remain:

```text
Core Requirements
      ↓
Security
      ↓
Stable User Experience
      ↓
AI Assessment
      ↓
Selected WOW Features
      ↓
Polish
```

The guiding rule is:

> Build the smallest secure and coherent version of Work Track that fully satisfies the coding challenge, then add enhancements only where time and quality permit.