# Personas

This document defines the primary personas for the Mini ATS.

The personas help guide product decisions, user flows, permissions, interface design, and prioritisation.

---

## Persona A — Platform Administrator

**Name:** Alex  
**Role:** Platform Administrator

### Goal

Efficiently onboard and support organisations using the ATS while maintaining clear oversight of administrative actions.

### Responsibilities

- Create customer organisations.
- Create customer user accounts.
- Create other administrator accounts.
- Support customers with recruitment-related activities.
- Operate on behalf of customer organisations when necessary.
- Review sensitive administrative activity.
- Manage account access and lifecycle where applicable.

### Needs

- A clear distinction between platform-level administration and customer-level recruitment activities.
- Visibility into which customer organisation is currently being managed.
- A simple way to create and manage accounts.
- Clear administrative controls.
- An audit trail for sensitive actions.
- Safe account lifecycle management, such as disabling or archiving accounts instead of immediately deleting them.

### Pain Points

- Accidentally performing an action within the wrong customer organisation.
- Limited visibility into who performed sensitive actions.
- Having to manually provision users or organisations directly in the database.
- Difficulty supporting customers when the system does not provide administrative access to their workspace.
- Risk associated with destructive actions such as account deletion.

### Typical Tasks

1. Review a prospective customer's access request.
2. Create a new customer organisation.
3. Create the first customer user for that organisation.
4. Create another platform administrator when necessary.
5. Select a customer organisation to manage.
6. Create jobs or candidates on behalf of a customer.
7. Review administrative activity.
8. Disable or archive accounts where necessary.

---

## Persona B — Recruiter / Customer

**Name:** Emma  
**Company:** Nordic Technologies  
**Role:** Recruiter / Customer User

### Goal

Quickly understand who is being considered for each open role and where each candidate is in the recruitment process.

### Responsibilities

- Create and manage job openings.
- Add candidates manually.
- Associate candidates with jobs.
- Track candidates through the recruitment pipeline.
- Search and filter candidates.
- Review candidate profile information.
- Access CVs and LinkedIn profiles.
- Use AI-assisted candidate assessment where available.

### Needs

- A simple way to create jobs.
- A fast way to add candidates.
- Clear visibility of all candidates associated with each job.
- A compact Kanban pipeline.
- Candidate-name search.
- Job-based filtering.
- Easy access to candidate details.
- Clear indication of each candidate's current recruitment stage.
- Minimal friction when moving candidates through the pipeline.

### Pain Points

- Candidate information being spread across spreadsheets, emails, and browser tabs.
- CVs being difficult to locate.
- Unclear recruitment status.
- Difficulty understanding which candidates belong to which jobs.
- Spending too much time manually organising recruitment information.
- Losing track of candidates as multiple jobs are managed simultaneously.

### Typical Tasks

1. Log into the ATS.
2. Create a job.
3. Add a candidate.
4. Associate the candidate with a job.
5. Open the recruitment pipeline.
6. Search for a candidate by name.
7. Filter candidates by job.
8. Move a candidate from one recruitment stage to another.
9. Open a candidate profile.
10. Review the candidate's LinkedIn profile and CV.
11. Run an AI-assisted CV assessment if available.

---

## Persona C — Candidate

**Name:** Jane  
**Role:** Software Engineer

### Core MVP Behaviour

In the core MVP, Jane is not an authenticated user of the ATS.

She exists as a candidate record managed by a Recruiter.

The Recruiter may store information such as:

- Full name.
- Email address.
- Phone number.
- LinkedIn profile.
- CV.
- Job associations.
- Recruitment stage.

### Goal

The candidate's goal exists primarily outside the core ATS interface: to be considered for a relevant job opportunity.

### Core Flow

```text
Recruiter identifies Jane
        ↓
Recruiter adds Jane to the ATS
        ↓
Jane is associated with a Job
        ↓
An Application is created
        ↓
Jane appears in the recruitment pipeline
