---
name: linear-skills
description: Create well-structured Linear issues with proper organization. Use when creating, planning, or breaking down work into Linear issues. Triggers on requests to create issues, plan work in Linear, break down tasks, or organize development work.
---

# Linear Issue Creation

Create focused, actionable Linear issues that provide enough context for any engineer to pick up and execute.

## Critical Rules

### 1. Discovery Before Creation

ALWAYS search Linear before creating projects or issues. This prevents duplicates.

```
# Before creating, search for existing:
- Projects with similar names/goals
- Issues that might already cover this work
- Closed issues that were previously attempted
```

### 2. Codebase Verification Before Work

ALWAYS verify codebase state before accepting issue scope at face value.

Issue descriptions may be outdated or speculative. APIs, features, or fixes may already be implemented. Check the actual code before scoping work.

### 3. Content vs Description Fields

Linear has TWO text fields — using the wrong one causes blank displays:

| Field         | Limit     | Shows In             |
| ------------- | --------- | -------------------- |
| `description` | 255 chars | List views, tooltips |
| `content`     | Unlimited | Main detail panel    |

- Use `description` for a one-line summary
- Use `content` for the full issue template (Goal, Context, Files, etc.)

## Core Principles

1. **One issue = one independent unit of work** — completable without external dependencies
2. **Describe WHAT, not HOW** — the implementer decides approach
3. **Context-rich** — include files, background, and constraints upfront
4. **Right-sized** — if complex, break into sub-issues (max 4)

## Required Fields

Every issue MUST have:

| Field           | Guidance                                                          |
| --------------- | ----------------------------------------------------------------- |
| **Title**       | Action-oriented, scannable. Start with verb.                      |
| **Description** | WHAT is being done + context (see template below)                 |
| **Urgency**     | Default to lower urgency. Only escalate with clear justification. |
| **Label(s)**    | At least one. Use for area, type, or scope.                       |
| **Estimate**    | Time estimate in hours or points. Always include.                 |

Project assignment is recommended but not enforced.

## Issue Description Template

**`description` field** (255 char max — for list views):

```
[Verb] [what] to [outcome]. Est: Xh
```

**`content` field** (full detail):

```markdown
## Goal

[One sentence: what this achieves when complete]

## Context

[Why this matters. Link to relevant discussions, specs, or decisions.]

## Relevant Files

- `path/to/file.ts` — [brief note on relevance]
- `path/to/another.ts` — [brief note]

## Scope

[Explicit boundaries: what's included, what's explicitly NOT included]

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Estimate

X hours
```

## Breaking Down Complex Issues

When an issue is too large or has multiple distinct parts:

1. Create a **parent issue** describing the overall goal
2. Create **sub-issues** (max 4) for each independent chunk
3. Each sub-issue must be completable on its own
4. Sub-issues inherit parent's project/labels unless overridden

Signs an issue needs breakdown:

- Estimate exceeds 3 hours
- Multiple unrelated files/systems involved
- Natural pause points exist
- Different expertise areas required

## Urgency Guidelines

Every issue MUST have an urgency defined.

Default to lower urgency. Escalate only when:

| Urgency    | Use When                                              |
| ---------- | ----------------------------------------------------- |
| **Urgent** | Blocking other work, production issue, deadline < 24h |
| **High**   | Important dependency, deadline < 1 week               |
| **Medium** | Normal priority work                                  |
| **Low**    | Nice-to-have, improvements, refactors                 |
| **None**   | Backlog, ideas, someday/maybe                         |

## Checkboxes

Use checkboxes for:

- Acceptance criteria
- Subtasks within a single issue (when sub-issues would be overkill)
- Verification steps

Do NOT use checkboxes as a substitute for proper sub-issues when work is truly separable.

## Examples

### Good Issue

**Title:** Add rate limiting to authentication endpoints

**Labels:** `security`, `api`  
**Urgency:** Medium  
**Estimate:** 4 hours

**`description`:** Add rate limiting to login/reset endpoints to prevent brute-force. Est: 4h

**`content`:**

```markdown
## Goal

Prevent brute-force attacks on login and password reset endpoints.

## Context

Security audit flagged this. See discussion in #security-review.

## Relevant Files

- `src/routes/auth/login.ts` — login endpoint
- `src/routes/auth/reset.ts` — password reset endpoint
- `src/lib/server/redis.ts` — existing Redis connection

## Scope

- Login endpoint: 5 attempts per 15 min per IP
- Reset endpoint: 3 attempts per hour per email
- NOT included: signup, magic links (separate issue)

## Acceptance Criteria

- [ ] Rate limiting applied to POST /auth/login
- [ ] Rate limiting applied to POST /auth/reset
- [ ] Returns 429 with Retry-After header when exceeded
- [ ] Logs rate limit events

## Estimate

4 hours
```

### Bad Issue (too vague)

**Title:** Fix auth  
**Description:** Auth is broken, please fix.

Problems: No context, no files, no scope, no acceptance criteria, no estimate.
