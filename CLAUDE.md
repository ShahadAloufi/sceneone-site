# CLAUDE.md

# Project

Project Name: Scene One

Scene One is a professional platform that connects screenwriters with professional script readers for script evaluations.

This is a production application, not a prototype or demo.

Every implementation should prioritize:
- Security
- Scalability
- Maintainability
- Clean architecture
- Performance
- Simplicity

Never sacrifice security for convenience.

---

# Development Workflow

For every task, always follow this workflow:

1. Understand the requirements.
2. Ask questions if requirements are ambiguous.
3. Create a plan before coding.
4. Explain the architecture if it affects the project.
5. Implement the feature.
6. Write clean, readable code.
7. Write or update tests when appropriate.
8. Review your own implementation.
9. Perform a security review.
10. Try to break your own implementation by thinking like an attacker.
11. Fix every issue you find.
12. Optimize performance if necessary.
13. Refactor if the code can be improved.
14. Explain what changed and why.

Never skip these steps unless explicitly instructed.

---

# Architecture Rules

This project is a **vanilla static site** — plain HTML, CSS, and JavaScript with
**no framework and no build step** — served on Vercel, with **Vercel serverless
functions** (plain JS `module.exports` handlers in `/api`) for the backend.
Do NOT introduce Next.js, React, a bundler, or a compile step. Keep it buildless.

Stack and conventions:
- **Pages:** static `.html` files at the project root (e.g. `index.html`,
  `submit.html`, `admin.html`).
- **Styles:** a single shared `css/styles.css`. Reuse existing classes and
  BEM-ish prefixes (`so-` for the submission form, `adm-` for the admin panel).
- **Client JS:** plain browser JS in `/js` (`main.js`, `admin.js`). No modules
  bundling; load libraries via CDN `<script>` tags when needed (e.g. supabase-js).
- **Backend:** serverless functions in `/api` as plain JS handlers. Use the
  native `fetch` API and avoid adding npm dependencies unless truly necessary
  (there is no `package.json` / install step today).
- **Database schema:** kept in `supabase/schema.sql`, run manually in Supabase.

Keep responsibilities separated:
- All business logic, validation, and privileged operations live **server-side**
  in `/api` functions — never in the browser JS.
- Client JS handles only UI, and calls the API. Client-side validation is for UX
  only and must always be re-validated on the server.

Never place business logic inside UI/presentation code.

Never duplicate code — factor shared logic into reusable helpers.

Keep the project modular and the files organized by responsibility.

---

# Security

Treat this project as if it will be used by thousands of users.

Security is mandatory.

Always:

- Validate every input on the server.
- Sanitize user input.
- Never trust client-side validation.
- Protect against SQL Injection.
- Protect against XSS.
- Protect against CSRF.
- Protect against IDOR.
- Protect against privilege escalation.
- Use secure authentication.
- Use secure authorization.
- Never expose secrets.
- Never expose database credentials.
- Never expose the Service Role Key.
- Use environment variables correctly.
- Never disable security checks.

Follow OWASP Top 10 recommendations.

---

# Supabase

Use Supabase as the backend.

Always:

- Enable Row Level Security (RLS).
- Create secure RLS policies.
- Follow least privilege.
- Never disable RLS.
- Never use Service Role Key on the client.
- Use Supabase Auth correctly.
- Protect database access.

---

# Authentication

Users must authenticate using Supabase Auth.

Support:

- Sign Up
- Login
- Logout
- Password Reset

Protect authenticated pages.

Protect admin routes.

Never rely only on frontend protection.

---

# Authorization

Authentication and authorization are different.

Always verify permissions.

Users should only access resources they own.

Admins should only access administrator functionality.

Never assume the frontend is secure.

Always verify permissions on the server.

---

# API Rules

Every API must:

- Validate input.
- Authenticate user.
- Authorize action.
- Return proper HTTP status codes.
- Return safe error messages.
- Never leak sensitive information.
- Use consistent response formats.

---

# Validation

Validate everything.

Never trust:

- Forms
- URLs
- Query parameters
- JSON
- Cookies
- Headers

Use schema validation whenever possible.

---

# File Uploads

Every uploaded file must be validated.

Check:

- MIME type
- File extension
- Maximum size

Reject unsafe files.

Never trust the filename.

---

# Code Quality

Write code like a senior software engineer.

Prioritize:

- Readability
- Simplicity
- Reusability
- Maintainability

Avoid:

- Dead code
- Duplicate code
- Magic numbers
- Long functions
- Large components

Keep files organized.

---

# Performance

Optimize only when necessary.

Avoid:

- Unnecessary rendering
- Unnecessary database queries
- N+1 queries
- Large bundles

Prefer efficient solutions.

---

# Error Handling

Never expose:

- Stack traces
- Internal paths
- Database errors
- Secrets

Provide safe and meaningful error messages.

---

# Logging

Log important events.

Never log:

- Passwords
- Tokens
- Secrets
- Sensitive user information

---

# Decision Making

Never make major architectural decisions without asking.

If multiple solutions exist:

- Explain each option.
- Compare pros and cons.
- Recommend the best approach.
- Wait for approval before making significant changes.

---

# Code Review

Before marking any task complete:

Review your implementation as:

- Senior Software Engineer
- Security Engineer
- QA Engineer

Critically evaluate your own work.

Assume your code contains bugs.

Find weaknesses.

Fix them.

Only then consider the task complete.

---

# Definition of Done

A task is NOT complete until:

✓ Code is clean.

✓ Security review completed.

✓ No obvious bugs remain.

✓ Performance reviewed.

✓ Architecture remains clean.

✓ Documentation updated if needed.

✓ Changes explained.

---

# Communication

Always explain:

- What you changed.
- Why you changed it.
- Any tradeoffs.
- Any assumptions.
- Any future improvements.

If unsure, ask before implementing.

Never guess.

Never invent requirements.

Always prefer correctness over speed.
