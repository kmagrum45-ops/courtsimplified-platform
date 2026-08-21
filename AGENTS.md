# CourtSimplified Repository Instructions

## Control protocol

- Begin every completion report with `CONTROL STATE CHECKPOINT`.
- Inspect existing files and architecture before editing.
- Work on one focused, bounded repair at a time.
- Report changed files, tests, remaining risks, and Git status.
- Never claim success without verification evidence.

## Product scope

CourtSimplified is one litigation operating system with three equal areas:

1. Ontario Small Claims
2. Ontario Family
3. Ontario Civil

Never narrow the platform to only one area. Distinguish shared systems from court-area-specific systems.

## Locked canonical architecture

Preserve this source chain:

Intake → CourtSimplifiedBrain → BrainMigrationLayer → MasterCaseSchema → CaseSystemAssembly → Specialized Intelligence Systems → Workflow → UI

- Reuse existing canonical engines, bridges, registries, schemas, workflows, and stores.
- Never create duplicate or parallel engines, schemas, workflows, case stores, or sources of truth.
- Prove an existing integration cannot be reused before adding one narrowly scoped adapter.
- Preserve specialized Family, Small Claims, and Civil intelligence outputs.
- Preserve existing unrelated MasterCase fields when updating a case.

## Case integrity

- Every persisted workflow must remain scoped to the authenticated user and selected case ID.
- Never allow one case or court area to inherit another case's facts, evidence, workspaces, forms, or strategy.
- Never substitute another case when selected-case loading fails.
- Preserve case IDs, selected-case ownership, canonical masterCase, and caseSystemAssembly.

## Security and privacy

- Never open, print, quote, stage, commit, or reveal `.env.local` or secrets.
- Never import server-only credentials into client code.
- Public routes must validate request shape, size, fields, arrays, and supported enum values.
- Unauthenticated requests must never trigger paid external AI.
- External AI eligibility requires server-verified authentication.
- Do not log sensitive user facts or raw error objects.
- Do not install dependencies, enable network access, or alter environment settings without approval.

## Legal-content boundary

- Software compilation and tests do not prove legal accuracy.
- Never invent statutes, rules, forms, deadlines, authorities, case law, or legal conclusions.
- Clearly distinguish software verification from legal-authority verification and legal review.
- Preserve uncertainty when jurisdiction, stage, role, facts, or authority currentness is unverified.

## Editing and Git safety

- Confirm branch and Git status before every editing task.
- Do not push, merge, switch branches, initialize Git, delete files, reset history, or overwrite unrelated work without explicit approval.
- Do not commit unless explicitly authorized after review and passing checks.
- Keep changes inside canonical files; do not provide partial replacement snippets when direct file editing is available.
- Do not modify generated registry or snapshot outputs unless the task specifically requires regeneration.
- Never run destructive Git commands.

## Required verification

Run only relevant checks, sequentially, because this laptop has 8 GB RAM.

Core checks:

- `npm run test:small-claims`
- `npm run test:case-isolation`
- `npm run test:three-area`
- `npx tsc --noEmit --pretty false`
- `git diff --check`

Use a maximum 4096 MB Node heap for an explicitly requested production build.

- Do not run multiple heavy checks simultaneously.
- Do not run `npm audit fix`.
- Do not run `npm audit fix --force`.
- The repository has inherited lint debt; use focused linting on changed files unless full lint cleanup is the authorized task.
- Do not stop an existing development server without approval.

## Definition of done

A task is complete only when:

1. The existing architecture was inspected.
2. The smallest canonical change was made.
3. Relevant regression tests passed.
4. Security and case-isolation boundaries were reviewed.
5. No unrelated files changed.
6. Remaining limitations were reported honestly.
7. Git status was reported.
8. Nothing was committed or pushed without approval.
