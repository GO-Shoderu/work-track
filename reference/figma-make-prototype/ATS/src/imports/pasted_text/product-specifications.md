The analysis is strong and broadly approved. Before you begin implementation, make the following corrections and treat them as final product/design decisions.

--------------------------------------------------
1. AUTHENTICATION
--------------------------------------------------

Remove the assumption:

"No real auth backend — Login will be a working UI shell with role-selection mock."

The production application uses Supabase Auth.

The prototype may use mock data internally, but the UX must represent the real authentication model.

The Login screen should contain normal authentication fields such as:

- Email
- Password
- Sign in

DO NOT include a role selector.

Users do not choose whether they are an Admin or Customer when logging in.

The authenticated user's role is derived from their account.

--------------------------------------------------
2. ROLE MODEL
--------------------------------------------------

The core product only requires:

- Admin
- Customer

The Platform Owner / Delegated Admin distinction is an agreed enhancement to support safer platform administration.

You may represent this distinction in the UX, but DO NOT design a large or complicated RBAC/IAM system.

Admin permissions should remain lightweight.

Do not create excessive permission-management screens or enterprise identity-management functionality.

--------------------------------------------------
3. ADMIN NAVIGATION
--------------------------------------------------

Use:

PLATFORM OWNER

Overview
Customers
Review
Admins
Inbox
Audit
Settings
Logout

"Review" specifically represents prospective Customer onboarding requests.

"Inbox" represents other administrative notifications, requests or actions requiring attention.

DELEGATED ADMIN

Overview
My Customers
Inbox
Settings
Logout

Only show functionality the delegated Admin is permitted to use.

CUSTOMER / RECRUITER

Overview
Jobs
Candidates
Pipeline
Settings
Logout

Do not include Notifications for Customers unless there is a concrete use case requiring them.

Pipeline remains a first-class navigation item.

--------------------------------------------------
4. ADMIN CUSTOMER CONTEXT
--------------------------------------------------

The Admin must never log in using a Customer's credentials.

When an Admin manages Customer data, use an explicit organisation context.

Example:

Managing:
Nordic Technologies

[Return to Platform Administration]

This context must remain visually obvious throughout the Customer workspace.

Do not refer to this UX as password-based impersonation.

--------------------------------------------------
5. JOB FLOW
--------------------------------------------------

Public Job publishing is a WOW feature, not a Core requirement.

The Core flow is:

Jobs
→ New Job
→ Create / Save Job

If public Job publishing is implemented, it should be an optional action:

Create Job
→ Save
→ Optional Publish / Generate Public Link

Do not make Publish mandatory.

--------------------------------------------------
6. CANDIDATE EXPERIENCE
--------------------------------------------------

Candidate Detail and Candidate Drawer should share the same reusable information components.

Candidate information architecture should include:

- Candidate Header
- Profile
- Applications
- CV
- AI Assessment
- Activity
- Notes, where appropriate

From the Candidate Directory, Candidate details may use a larger/full workspace.

From the Pipeline, Candidate details should open contextually without losing the Pipeline.

Prefer a persistent right-side detail panel similar to the attached Workline reference rather than a modal-like experience.

The Pipeline should remain visible while Candidate details are inspected.

--------------------------------------------------
7. PIPELINE
--------------------------------------------------

The Pipeline remains the hero screen.

Stages:

Applied
Screening
Interview
Offer
Hired

Rejected should be treated as a disqualified/archive state rather than being visually emphasised equally with the successful hiring path.

Candidate cards should remain compact.

Support:

- Job filtering
- Candidate-name search
- stage counts
- stage movement
- Candidate detail opening
- responsive horizontal scrolling where required

For drag-and-drop stage movement:

DO NOT require confirmation after every move.

Instead show feedback such as:

"Jane Smith moved to Interview"

[Undo]

This preserves speed while protecting against accidental movement.

--------------------------------------------------
8. OFFER STAGE
--------------------------------------------------

Do NOT create a separate Offer / Contract management screen.

Offer is only a recruitment pipeline stage in the current scope.

Offer-letter generation, contracts, signatures and negotiation workflows are future functionality and are outside this prototype.

--------------------------------------------------
9. CV
--------------------------------------------------

For the current design, assume:

- CV upload
- file metadata
- secure view/download action

A sophisticated inline document viewer is not required.

--------------------------------------------------
10. AI ASSESSMENT
--------------------------------------------------

Keep AI assessment manual.

Do not automatically run AI assessment when a CV is uploaded.

The Recruiter explicitly chooses:

Run AI Assessment

Display:

- Match / assessment indicator
- Strengths
- Potential gaps
- Supporting evidence
- Summary

Include:

"AI-assisted assessment. Human recruiter judgement is required."

Avoid presenting a score without explanation.

--------------------------------------------------
11. PUBLIC EXPERIENCES
--------------------------------------------------

Keep the following as WOW functionality:

- Request Access
- Customer onboarding review
- Public Job page
- Public Candidate application

These should be designed coherently but remain secondary to the authenticated ATS experience.

--------------------------------------------------
12. REMOVE / DEFER
--------------------------------------------------

Do not introduce:

- Calendar
- Payroll
- Employee management
- Leave management
- Performance management
- Contract management
- Offer-letter generation
- Complex analytics dashboards
- Candidate accounts
- HRIS functionality
- unrelated enterprise administration

These are outside the current ATS scope.

--------------------------------------------------
13. DASHBOARD / OVERVIEW
--------------------------------------------------

Do not fill Overview screens with decorative analytics.

Only show information that helps the user make a decision or navigate to work that requires attention.

Examples:

Platform Owner:
- Customers
- pending Customer reviews
- active Jobs
- recent administrative activity
- actions requiring attention

Recruiter:
- active Jobs
- Candidates
- Applications by major stage
- recent recruitment activity

Keep dashboards operational rather than decorative.

--------------------------------------------------
14. REUSABLE DESIGN
--------------------------------------------------

The prototype should visibly use a reusable component system.

Candidate information components should be reused between:

- Candidate Directory
- Candidate Detail
- Pipeline Candidate Drawer

Job components should be reused where appropriate.

Admin list/detail patterns should use the same visual language as Candidate list/detail patterns.

The result should feel like one coherent product, not 19 separately designed screens.

--------------------------------------------------
15. REFERENCE DESIGN
--------------------------------------------------

Continue using the attached Workline image as the primary visual reference.

Preserve its underlying UX principles:

GLOBAL NAVIGATION
→ COLLECTION / FILTER CONTEXT
→ ITEM LIST
→ ITEM DETAIL

Do not simply copy its colours.

Adapt its progressive-disclosure model to the ATS.

Visual direction remains:

- near-black navigation
- off-white workspace
- lime accent
- subtle grey borders
- restrained shadows
- compact typography
- generous whitespace
- rounded panels
- avatars
- small status indicators
- professional SaaS aesthetic

--------------------------------------------------
FINAL INSTRUCTION
--------------------------------------------------

With these corrections, the product structure is approved.

Proceed to create the high-fidelity desktop prototype.

Start by establishing:

1. design-system tokens;
2. shared components;
3. main application shell;
4. Customer Pipeline;
5. Candidate experience;
6. Jobs;
7. Customer Overview;
8. Platform Admin screens;
9. public WOW screens.

Keep the Pipeline and Candidate experience as the highest-priority screens.

Do not introduce additional product scope without asking first.