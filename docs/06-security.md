
---

# `docs/06-security.md`

And this is the one I particularly do **not** want us to skip.

Later, `AGENTS.md` will explicitly instruct Codex to read this before touching authentication, Supabase, RLS, CV storage, accounts, or AI. 

```md
# Security

## 1. Purpose

This document defines the security principles, requirements, trust boundaries, and implementation rules for the Mini Applicant Tracking System (ATS).

Security is treated as a first-class engineering requirement.

The ATS processes potentially sensitive information including:

- Customer account information;
- Candidate personal information;
- Candidate contact details;
- LinkedIn profile information;
- CV documents;
- recruitment information;
- AI Candidate assessments.

Security shall therefore be considered throughout architecture, implementation, testing, deployment, and AI-assisted development.

---

# 2. Security Principles

The system shall follow these principles:

- Never trust the client.
- Authentication does not automatically imply authorization.
- Customer organisations must remain isolated.
- Authorization shall be enforced at trusted boundaries.
- Privileged credentials must remain server-side.
- Sensitive files shall be private by default.
- User-supplied and uploaded content is untrusted.
- AI-generated code must undergo security review.
- AI model input must be treated as untrusted.
- Prefer least privilege.
- Prefer reversible administrative actions over unnecessary destructive actions.
- Security controls shall not be disabled merely to make a feature work.

---

# 3. Threat Model Overview

The system must consider threats including:

```text
Unauthenticated access

Horizontal privilege escalation

Vertical privilege escalation

Customer A accessing Customer B data

Customer invoking Admin operations

Manipulated organisation identifiers

Manipulated Candidate or Job identifiers

Insecure direct object references

Exposed privileged API keys

Insecure CV storage

Malicious file uploads

Cross-site scripting

Invalid or malicious form input

Public-form abuse

AI prompt injection

AI hallucination

AI misuse of protected characteristics

Sensitive information in logs

Secrets committed to Git

Overly permissive Supabase RLS policies

AI-generated insecure code
