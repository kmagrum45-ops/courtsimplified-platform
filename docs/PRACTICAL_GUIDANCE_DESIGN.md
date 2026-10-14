# The practical help lane — design

Status: **design, not built.** Adopted by the site owner on 2026-10-13
(`docs/MASTER_PLAN.md`, decision log; CLAUDE.md s. 2, "Practical guidance is a
separate lane"). Built with Phase 4 ("What you must show, and your evidence").

## 1. Why

Run 38496258791 (2026-10-13) played a homeowner whose interlock contractor did
bad, unfinished work on a $300,000 job and then registered a $60,000
construction lien. The site found the right law (Construction Act ss. 31, 36,
44, 45, 47, 50) but said nothing a lawyer would say next:

- get an independent construction expert to inspect the base, compaction and
  slopes, and write a report a court will accept;
- get two or three written, itemised quotes, separating "fix" from "finish";
- photograph the slopes with a level, the water running toward the house, the
  sinking pavers and the unfinished areas, dated, and the same spots over time;
- do not tear anything out until it is documented and inspected;
- order the parcel register to see the claim for lien and any certificate of
  action.

None of that is a rule, a form or a deadline, so the legal lane cannot say it.
The chat (`chat/libraryChat.ts`) can only select pre-checked blocks; the model
never writes words. That is right for law and is why everything outside law
reads as robotic or is missing.

The same gap shows wherever a person has to *get information*:
access-to-information requests, an institution's own policies and logs (the
case behind `docs/RESEARCH_GUIDANCE_DESIGN.md`), title searches, medical
records, police reports, employer files.

## 2. The two lanes

| | Legal lane (exists) | Practical lane (this design) |
|---|---|---|
| What | What the law, a rule, a form, a court or a deadline says | What to gather and how, how to get records and reports, who to ask, what to look for |
| Written by | Checked library blocks; checked answers (`retrieval/checkedAnswer.ts`) | The model, in its own words, about this person's case |
| Check | Every statement matched word for word to the official text | Each sentence screened: no law (legal sentences go to the legal lane), no grading, no settlement push |
| Sources | Statutes, rules, forms, decisions | The institution's own official page, fetched and linked, for any fact about that institution |
| Shown as | The rule, with citation | "Practical steps", labelled as general practical guidance |

The line between them is the sentence, not the topic. "Take dated photos of the
slope with a level in the shot" is practical. "An expert's report must include
an acknowledgment of the expert's duty (Form 53)" is legal and goes through the
legal lane (Rules of Civil Procedure, r. 53.03, saved in the corpus).

## 3. How an answer is made

1. **Inputs.** The case record (side, court, stage, claim type, dates, amounts,
   what is recorded and what is missing — Phase 4's list of parts) and, when
   asked, the person's question.
2. **Draft.** One model call writes practical steps for the parts that are
   missing or weak in the record ("weak" means not yet recorded or not yet
   documented, never "unlikely to succeed"). Output is a list of short items,
   each tied to the part of the case it serves and tagged `practical`,
   `legal` or `institution`.
3. **Screen.** Code runs every item through:
   - the legal detector (`hasLegalContent`, `intelligence/groundedCognition.ts`)
     and the model's own tag. A `legal` item, or a `practical` item the
     detector flags, is sent to the checked-answer engine. It is shown only if
     it passes there, with its citation; otherwise it is dropped and its topic
     listed as "could not confirm".
   - the case-strength guard used elsewhere (`outcomeTermNotInProvision`,
     the s. 3 terms): no strong/weak, no chances, no "you will win", no
     settlement pressure.
   - a number check: every number is in the person's own words, the record,
     or a checked legal statement.
4. **Institution facts.** An `institution` item (how a named body takes
   requests, what records it keeps, its published policy) is shown only with a
   page fetched from that body's own official domain, quoted and linked
   (`quoteMatch.ts`), with the date fetched. With no page, the item says what
   to ask the body for, without stating its process.
5. **Show.** A "Practical steps" section beside the evidence list on the
   next-step card and the case page, each item with "why this helps" in plain
   words, and a one-line label: general practical guidance, not legal advice
   and not a judgment of the case. Suggestions only (s. 4); the person can tick
   an item done, which goes into the case record.

## 4. What it should cover (first pass)

- **Evidence a court can use.** Independent expert reports (and that an expert
  must be neutral; the formal requirements come from the legal lane), several
  written quotes, dated photos and video taken to show the problem, keeping
  original files, a dated timeline, witnesses and their contact details,
  receipts, records of steps taken to limit the damage.
- **Preserving evidence.** Document before repairing; keep messages and
  originals; ask the other side in writing to keep theirs.
- **Getting records.**
  - Title: ordering the parcel register and what to look for on it.
  - Access to information: which law covers the body (provincial or
    municipal), how to word a request so it catches emails, notes, logs and
    policies, and that a refusal can be appealed. The laws themselves (FIPPA,
    MFIPPA) are **not in the corpus yet** and must be saved before any
    deadline, fee or appeal step is stated (legal lane).
  - An institution's own standards: policies, procedures, schedules,
    incident logs (`docs/RESEARCH_GUIDANCE_DESIGN.md` s. 4 has the
    categories; its content now feeds this lane).
  - Medical, police, employment and insurance records: who holds them and
    how to ask.
- **Finding help.** What kind of professional fits (an engineer, a
  hardscape inspector, an accountant), what to ask them to measure or report
  on, and the referral routes the site already lists.

## 5. Switch, cost, limits

- **Switch.** `PRACTICAL_GUIDANCE` in `policy/a2iScope.ts`, tier
  "needs A2I approval", on while `OWNER_LIVE_TESTING` is on (2026-10-12
  direction). Before real users: the A2I description calls it general
  practical guidance, separate from the reviewed legal content, because the
  Stage 1 application said Jason and Krystel review all legal content before
  users see it, and this lane is written live.
- **Cost.** One draft call per case step (cached on the record until a fact
  changes), plus the checked-answer calls for any legal items. Counted in the
  spend guard like every AI route.
- **Fetching.** Only official domains (government, courts, and the named
  institution's own domain); never CanLII (`refuseCanliiContent`). One page per
  institution item, cached.
- **Failure.** Any failure shows the evidence list as today, with no practical
  section; never a broken page.

## 6. Tests

- A suite (`test:practical-guidance`, free, stub model output) asserting the
  properties, not today's wording: a legal sentence never appears unless the
  checked-answer engine passed it; an institution fact never appears without a
  fetched page and a matching quote; no grading terms; every number traced.
- Walkthrough probe cases (`PROBE_PERSONAS`, branch
  `claude/lien-walkthrough-probe`): the lien homeowner must get an expert,
  quotes, photographs and the title search in his practical steps.
- The finish-line conversation check gains: practical steps relevant to the
  person's case, none for another kind of case.

## 7. Open decisions

1. Which domains count as "official" for fetching (a fixed list, or the
   institution's own domain as named by the person, confirmed by them).
2. Whether ticking a practical step done can add an item to the evidence list
   automatically, or only suggests it (s. 4 says suggest).
3. When the lane goes into the A2I description: with the next submission, or
   before any real user sees it.
