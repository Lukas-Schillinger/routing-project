---
name: notion-issues
description: Create well-structured Notion issues with proper organization. Use when creating, planning, or breaking down work into Notion issues. Triggers on requests to create issues, plan work, break down tasks, or organize development work.
---

# Notion Issue Creation

Create focused, actionable issues in the Notion issues database that provide enough context for any engineer to pick up and execute.

The issues database is at: https://www.notion.so/321bf27e4b4d8012bcd1c368e7ddf383

## Critical Rules

### 1. Discovery Before Creation

ALWAYS search the Notion issues database before creating new issues. This prevents duplicates.

```
# Before creating, search for existing:
- Issues with similar names/goals
- Issues that might already cover this work
- Done issues that were previously attempted
```

### 2. Codebase Verification Before Work

ALWAYS verify codebase state before accepting issue scope at face value.

Issue descriptions may be outdated or speculative. APIs, features, or fixes may already be implemented. Check the actual code before scoping work.

### 3. Page Content Structure

Notion issues have properties AND page body content:

| Field              | Use For                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| **Name**           | Action-oriented title                                                                               |
| **Description**    | Short summary (list view)                                                                           |
| **Status**         | Not started / In progress / Done / Cancelled                                                        |
| **Area**           | TSP Service, Render Service, Frontend, Database, Backend                                            |
| **Type**           | Feature, Bug, Chore, Refactoring, Security, Testing, Performance, Infrastructure, Planning, Billing |
| **Priority Level** | Urgent, High, Medium, Low, None                                                                     |
| **Page body**      | Full context (Goal, Files, etc.)                                                                    |

## Core Principles

1. **One issue = one independent unit of work** — completable without external dependencies
2. **Describe WHAT, not HOW** — the implementer decides approach
3. **Context-rich** — include files, background, and constraints upfront
4. **Right-sized** — if complex, break into sub-issues (max 4)

## Required Fields

Every issue MUST have ALL of these:

| Field              | Guidance                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Name**           | Action-oriented, scannable. Start with verb.                                                                |
| **Description**    | Short summary + exclusions                                                                                  |
| **Area**           | One of: TSP Service, Render Service, Frontend, Database, Backend                                            |
| **Type**           | One of: Feature, Bug, Chore, Refactoring, Security, Testing, Performance, Infrastructure, Planning, Billing |
| **Priority Level** | **MANDATORY.** Default to lower. See guidelines below.                                                      |
| **Page body**      | Full context: Goal, Context, Relevant Files, Estimate                                                       |

## Issue Page Body Template

**`Description` property** (for list views):

```
[Verb] [what] to [outcome]. NOT: [excluded items].
```

**Page body content** (full detail):

```markdown
## Goal

[One sentence: what this achieves when complete]

## Context

[Why this matters. Link to relevant discussions, specs, or decisions.]

## Relevant Files

- `path/to/file.ts` — [brief note on relevance]
- `path/to/another.ts` — [brief note]

## Estimate

X hours
```

## Creating Issues

Use `notion-create-pages` to create issues in the database. Set:

- `Name` — the issue title
- `Description` — short summary
- `Status` — typically "Not started"
- `Area` — the relevant area
- `Type` — the issue type
- `Priority Level` — urgency level
- Page body — the full template above

## Breaking Down Complex Issues

When an issue is too large or has multiple distinct parts:

1. Create a **parent issue** describing the overall goal
2. Create **sub-issues** (max 4) for each independent chunk
3. Each sub-issue must be completable on its own

Signs an issue needs breakdown:

- Estimate exceeds 8 hours
- Multiple unrelated files/systems involved
- Natural pause points exist
- Different expertise areas required

## Priority Guidelines

Default to lower priority. Escalate only when:

| Priority   | Use When                                              |
| ---------- | ----------------------------------------------------- |
| **Urgent** | Blocking other work, production issue, deadline < 24h |
| **High**   | Important dependency, deadline < 1 week               |
| **Medium** | Normal priority work                                  |
| **Low**    | Nice-to-have, improvements, refactors                 |
| **None**   | Backlog, ideas, someday/maybe                         |

## Examples

### Good Issue

**Name:** Add rate limiting to authentication endpoints

**Area:** Backend
**Type:** Security
**Priority Level:** Medium
**Description:** Add rate limiting to login/reset endpoints to prevent brute-force. NOT: signup, magic links.

**Page body:**

```markdown
## Goal

Prevent brute-force attacks on login and password reset endpoints.

## Context

Security audit flagged this. Login should allow 5 attempts per 15 min per IP. Reset should allow 3 attempts per hour per email.

## Relevant Files

- `src/routes/auth/login.ts` — login endpoint
- `src/routes/auth/reset.ts` — password reset endpoint
- `src/lib/server/redis.ts` — existing Redis connection

## Estimate

4 hours
```

### Bad Issue (too vague)

**Name:** Fix auth
**Description:** Auth is broken, please fix.

Problems: No context, no files, no estimate.
