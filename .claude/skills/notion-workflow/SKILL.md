---
name: notion-workflow
description: Work on Notion issues with enforced status tracking. Use when picking up, working on, or completing issues. Triggers on requests to work on issues, fix review items, or process backlog.
---

# Notion Issue Workflow

This skill enforces disciplined issue lifecycle management. Follow every step in order — no exceptions.

The issues database is at: https://www.notion.so/321bf27e4b4d8012bcd1c368e7ddf383

## Phase 1: Claim (MANDATORY FIRST STEP)

Before doing ANYTHING else — before reading code, before planning, before exploring:

1. Search the Notion issues database for the most urgent unstarted issue matching your assigned area
2. **Immediately** update its Status to `In progress` using `notion-update-page`
3. Only after the status update confirms success, proceed to Phase 2

This is non-negotiable. The status must be updated BEFORE any planning or exploration begins.

## Phase 2: Plan (MANDATORY)

**Enter plan mode before modifying any files.** This is a hard gate — no file edits until a plan is approved. Even if the fix is simple a plan must be made.

1. Enter plan mode
2. Read the issue page content, referenced review files (`.claude/review.md`, `.claude/best-practices-audit.md`)
3. Explore the codebase to understand the problem
4. Verify the problem actually exists and check for:
   - False positives (problem doesn't exist or was already fixed)
   - Wrong severity (a "critical" that's actually low-impact)
   - Wrong fix (the suggested fix is worse than the current code)
   - Symptoms of a larger structural problem (always fix the root cause, not the symptom)
5. Design a solution and present it for approval
6. Get explicit approval before proceeding

If the issue appears invalid during planning:

- **Do NOT cancel independently.** Present your findings in the plan and recommend cancellation with reasoning.
- Only set status to `Cancelled` (with a comment explaining why) after the user explicitly approves.
- **Stop here** — do not proceed to implementation

If the issue is a symptom of something bigger:

- Add a comment on the Notion page explaining the root cause
- Adjust your plan to fix the root cause instead

## Phase 3: Implement

1. Exit plan mode
2. Implement the fix following CLAUDE.md conventions
3. **Always fix the root cause.** Never use workarounds, hacks, or suppress warnings/errors
4. Run the code-simplifier agent on all modified files
5. Run `npm run check && npm run lint` — fix any failures
6. Run relevant tests if they exist
7. Commit with the issue name in the message (e.g. `Fix rate limiting on login endpoint`). One commit per issue, don't push or create PRs.

## Phase 4: Complete (MANDATORY FINAL STEP)

**Before reporting back to the user**, you MUST update the issue status:

- If implemented successfully → set status to `Done`
- If the issue was invalid → set status to `Cancelled` (only after user approved cancellation in Phase 2)

This step is non-negotiable. Never finish work on an issue without updating its status. If the Notion API call fails, retry once, then inform the user that the status needs manual update.

## Checklist

Use this to self-verify compliance at the end of each issue:

- [ ] Status set to `In progress` BEFORE any exploration or planning
- [ ] Plan mode used before any file edits
- [ ] Plan approved before implementation
- [ ] Root cause fixed (not symptoms)
- [ ] `npm run check && npm run lint` passes
- [ ] Committed with issue name in the message
- [ ] Status set to `Done` or `Cancelled` AFTER all work is complete

## Environment

- **Dev server:** `portless $(basename $PWD) vite dev` (not `npm run dev`)
- **Frontend verification:** Always verify UI changed in claude chrome. Provision a dev account via `POST <dev-server-url>/api/dev/provision` and verify in browser.
- **Commits:** One per issue. Don't push or create PRs — branches are reconciled by the user
