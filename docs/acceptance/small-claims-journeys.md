# Small Claims journeys: the shared acceptance script

**One script, three readers.** CI runs it (`tests/browser/acceptance/small-claims-journeys.spec.ts`), Claude runs
it before saying anything is fixed, and the Chrome tester follows it by hand. "Fixed" means this script passes in a
real browser on the preview of the newest commit (site owner, 27 Nov 2026, item J).

**Only the site owner changes the expectations in this file.** Anyone who thinks an expectation is wrong says so and
waits. Every finding the Chrome tester makes that this script passed becomes a new check here: first shown red, then
the code is fixed, then shown green.

The executable test reads the `json` block under each story **from this file**, so the doc and the test can never
disagree. Words outside the blocks are for people.

## How to run it

- **By hand (Chrome tester):** open the preview of the newest commit, sign in with the staging test account, and
  follow the steps below for each story. Take a screenshot at every numbered step, named `T<story>-<step>` (for
  example `T7-03`). Fill in the PASS/FAIL table at the end.
- **CI / Claude:** `npx playwright test tests/browser/acceptance/small-claims-journeys.spec.ts`, with
  `PLAYWRIGHT_BASE_URL` set to the preview (or a local build of the commit). It signs in with a staging test account
  made for the run (never production; no password is kept in the repository), uses the real AI the preview uses, and
  saves `T<story>-<step>.png` plus `table.md` (the PASS/FAIL table) as artifacts.

## The rules applied on every screen

Each numbered step is one screen, read **as the person sees it** (the visible text of the page once it has settled).

| Rule | What fails the step |
|---|---|
| **(a) Once** | A fact the story states appears twice in what the screen asks or offers. |
| **(b) Never asked** | A question or a Yes / No / I'm not sure card asks a fact the story already states, or one already shown under "Here is what we understood" or already answered. |
| **(c) Never shown** | Any string in the story's `neverShown` list, or in the list for every story: `Not given`, ` -- `, `signal timed out`, `AbortError`, `Error:`, `undefined`, `[object`, `null`, `elementStateMap` (`null` and `undefined` only as whole words), `This card doesn't list`, `Your next steps come after the summary`, `Initial questions establish your situation`; and, for every story where nothing has been filed (`"start": "nothing-filed"`): `Claim served`, `Claim filed`, `Suggested step`; on the first screen of each story (home and the builder's start): `Intake saved to your account` (I2i); and in the new Small Claims flow: `Send my story` (I2k). |
| **(d) Counts match** | "N still to answer" differs from the number of open questions on that screen; "N of M still to add" differs from the number of items shown to add. |
| **(e) Console** | Any console error or unhandled rejection on the page. |
| **(f) Duplicates** | Any sentence of 60 or more characters, or any source citation (rule, section, regulation, decision), appears twice on one screen. |
| **(g) From your story** | A value labelled "From your story" or "Confirmed from the story" is not something the person wrote: its quote is not in the story, or the value's words are not in its quote (or, with no quote, not in the story). |
| **(h) Buttons work** | On the Form 7A checklist, "I have this" (with words typed) or "I don't have this" does not take the item off the list. |
| **(i) Kept** | An answer given (a value confirmed with Yes, "I don't know yet", "I have this" with its words, "I don't have this", or an outcome the person typed) is missing from the review summary, from the case page, or from either after a page reload. |
| **(j) One notice** | "not a law firm", "How AI is used here" or the yellow "built by people who have represented themselves" notice appears more than once on a screen's body (the footer is not counted). |
| **(k) Account details once** | Stories 8 and 8b run one after the other in the SAME signed-in account. The second case asks the plaintiff's own name, address, phone or email again. |
| **(l) Checklist prefilled** | For a story with a `notStillToAdd` list, one of those Form 7A checklist items is listed as "still to add", or counts in "N of M". |
| **(n) Not answered yet** | "Not answered yet" (or "add it when you know") shows for a fact the same screen shows as answered or read from the story (I2c). "I don't know yet" is not an answer. |
| **(o) Question twice** | The same question (text ending in "?", any length, compared the way (f) compares) shows twice on one screen; or a fact is shown as "not asked again" while the same screen asks it (I1c). |
| **(p) Story once** | The story's first sentence shows more than once on one screen, counting what is inside boxes (I1f). |
| **(q) One control** | A card with an "Is this right? Yes, that's right" control also has a separate "Not right" button (I1j). |
| **(r) Labels stable** | Stories 8b and 9, each run twice: the "Here is what we understood" labels differ between the two runs (I2d). |
| **(s) Sign-up words true** | The page says an email link confirms the address, and one real sign-up through the form is signed in at once (I2h). Run once per run. |
| **(t) Next step reachable** | In the new Small Claims flow, the Forms step has no button or link that leads on to the next step (site owner, 27 Nov 2026: "Forms leads nowhere" is a failing row). |
| **(m) Quick** | More than 20 seconds from pressing "Show my next step" to the overview showing. (About 1 to 1.5 minutes on 27 Nov 2026, so this fails today; it is tightened later.) |

## The click path (every story)

1. **T-01 Home.** Signed in. Open `/?path=small-claims`. Type the city, then the story (word for word, below). Press
   "Continue to Small Claims intake". Read "Here is what we understood" and "What we still need to know". Answer
   any question there only if the story states the answer; otherwise leave it.
2. **T-02 Start.** Tick "Before you start" if asked. Answer the start questions as the story says (nothing filed, or
   served, or filed in the wrong place).
3. **T-03 onward, the chat.** Press "Answer questions one at a time" and "Send my story" if shown. For each card or
   question, one screen each: press **Yes** for a value the story states; for a kind-of-claim suggestion, press its
   first button; type **"I do not know yet"** for anything else. Stop when the review opens.
4. **Review.** Read it. Record "I don't know yet" for anything still asked. Tick the confirmation if asked. Press
   Confirm.
5. **Next step.** Press "Show my next step" and wait for the overview. Note the seconds it took (rule (m)).
6. **Form 7A.** Read "Preparing your Plaintiff's Claim (Form 7A)". On each item to add, alternately type "The
   screenshots and the emails I kept" and press **I have this**, or press **I don't have this**.
7. **Case page.** Open the case page and read it.
8. **Reload.** Reload the case page and read it again. Then open the next-step page again and read its Form 7A
   checklist: nothing answered in step 6 is back on "still to add" (rule (i)).

Stories 8 and 8b are followed one after the other without signing out, in the same account (rule (k)).

A story with an `answers` block answers those questions in its own words instead of "I do not know yet": `outcome`
is typed wherever the outcome is asked (home card or chat), and `ownDetails` fills the person's own boxes on the
review with made-up test values. Rule (i) then checks they are kept; rule (k) checks story 8b does not ask them again.

**Second route (Chrome's, I1c).** Story 8b is also followed, in its own account, by pressing "Stop initial questions
and review" right after step 2 instead of the chat; steps 4 to 8 are the same.

## The stories

### Story 1: kitchen deposit (Chrome's test of #563)

```json
{ "id": "1", "name": "kitchen deposit", "city": "Ottawa", "start": "nothing-filed",
  "story": "I hired TEST Fakebuild Contracting Inc. to renovate my kitchen in Ottawa. In March 2026 I paid them a $12,500 deposit by e-transfer. They never started the work and stopped answering my calls and emails. On April 20, 2026 I sent them a demand letter by email asking for the deposit back within 14 days, and they never replied. I want my $12,500 deposit back, plus interest and my court costs.",
  "stated": { "amount": "\\$?12,500", "whenHappened": "March 2026", "otherParty": "Fakebuild", "wants": "deposit back", "whatFor": "renovate my kitchen", "paymentMethod": "e-transfer", "workDone": "never started the work", "demand": "April 20,? 2026", "interestCosts": "interest and my court costs" },
  "neverShown": ["defamation", "Grant v. Torstar", "Libel and Slander Act", "Landlord and Tenant Board"] }
```

### Story 2: Alex, a $2,000 loan (Chrome)

```json
{ "id": "2", "name": "loan to Alex", "city": "Ottawa", "start": "nothing-filed",
  "story": "In January 2026 I lent my friend Alex $2,000 so he could fix his car. He promised to pay me back by the end of March 2026. He has not paid back anything and now he ignores my texts. I want my $2,000 back.",
  "stated": { "amount": "\\$?2,000", "whenHappened": "January 2026", "wants": "\\$?2,000 back", "otherParty": "Alex", "relationship": "my friend", "whatFor": "fix his car", "dueDate": "end of March 2026", "paidBack": "not paid back anything", "demand": "ignores my texts" },
  "neverShown": ["defamation", "Grant v. Torstar", "Libel and Slander Act", "Landlord and Tenant Board"] }
```

### Story 3: Rebecca, defamation (Jason's live-site test, surname made up)

```json
{ "id": "3", "name": "defamation, Rebecca", "city": "Ottawa", "start": "nothing-filed",
  "story": "My uncles ex girlfriend Rebecca Testsurname has been telling people I stole from her. She said it on sept 14 2025. I want 10000 dollars. nothing filed.",
  "stated": { "amount": "\\$?10,?000", "whenHappened": "sept(ember)? 14,? 2025", "otherParty": "Rebecca Testsurname", "relationship": "uncles ex girlfriend", "whatSaid": "I stole from her", "filed": "nothing filed" },
  "neverShown": [] }
```

### Story 4: fridge repair, deciding whether to sue

```json
{ "id": "4", "name": "fridge repair", "city": "Kingston", "start": "nothing-filed",
  "story": "In May 2026 I paid Testfix Appliance Repair Ltd. $1,850 to fix my fridge. It broke again two days later and they refuse to come back. I want my $1,850 back.",
  "stated": { "amount": "\\$?1,850", "whenHappened": "May 2026", "otherParty": "Testfix", "wants": "\\$?1,850 back", "whatFor": "fix my fridge", "demand": "refuse to come back" },
  "neverShown": ["defamation", "Grant v. Torstar", "Libel and Slander Act", "Landlord and Tenant Board"] }
```

### Story 5: served as a defendant

```json
{ "id": "5", "name": "served defendant", "city": "Kingston", "start": "served:small-claims-7A:2026-11-10",
  "story": "On November 10, 2026 I was served with a Plaintiff's Claim. My former landlord, Robin Testlandlord, says I owe $3,200 for damage to the apartment. I left it clean and have photos.",
  "stated": { "amount": "\\$?3,200", "servedDate": "November 10,? 2026", "otherParty": "Robin Testlandlord", "relationship": "former landlord", "whatFor": "damage to the apartment", "evidence": "have photos" },
  "neverShown": ["Preparing your Plaintiff's Claim", "Plaintiff 1 (you)"] }
```

### Story 6: filed in the wrong place

```json
{ "id": "6", "name": "wrong place", "city": "Kingston", "start": "going:both:filed-in-wrong-place",
  "story": "I filed a claim against Testcar Sales Inc. for $4,000 in Ottawa, but the court office told me it should have been filed in Kingston, where the car was sold.",
  "stated": { "amount": "\\$?4,000", "otherParty": "Testcar", "filed": "filed a claim", "filedWhere": "in Ottawa", "rightPlace": "Kingston" },
  "neverShown": [] }
```

### Story 7: defamation by private text message (site owner, 27 Nov 2026)

A private text to two relatives is neither a "newspaper" nor a "broadcast" (Libel and Slander Act, R.S.O. 1990,
c. L.12, s. 1 (1), retrieved 27 Nov 2026), so nothing about the newspaper notice, the three-month rule, set-off
(a debt defence) or the Landlord and Tenant Board may show.

```json
{ "id": "7", "name": "defamation by text", "city": "Ottawa", "start": "nothing-filed",
  "story": "On September 14, 2025 my uncle's ex-girlfriend Rebecca Testsurname sent a private text message to my father and my uncle saying I stole from her. I have screenshots with her exact words. I asked her to stop and she refused. I want $10,000 for defamation and emotional distress. Nothing has been filed.",
  "stated": { "amount": "\\$?10,000", "whenHappened": "September 14,? 2025", "otherParty": "Rebecca Testsurname", "relationship": "uncle's ex-girlfriend", "howSaid": "private text message", "whoHeard": "my father and my uncle", "whatSaid": "I stole from her", "evidence": "screenshots", "demand": "asked her to stop", "filed": "Nothing has been filed" },
  "neverShown": ["newspaper", "broadcast", "s. 111", "set-off", "Landlord and Tenant Board", "written notice", "six weeks", "three months", "Copy of the written notice sent", "Records establishing when the statement was discovered", "day of the injury", "Libel and Slander Act, s. 5", "Libel and Slander Act, s. 6"],
  "notStillToAdd": ["The statement itself", "Proof it was seen or heard by someone else"] }
```

### Story 8: loan to a neighbour (site owner, 27 Nov 2026)

Stories 8 and 8b do not say what outcome the person wants. The site may ask it ONCE; any "From your story: I want
... back" fails rule (g), because the story never says it.

```json
{ "id": "8", "name": "loan to Jordan", "city": "Ottawa", "start": "nothing-filed",
  "story": "My neighbour Jordan Testfield borrowed $4,000 from me on March 3, 2026 and promised to pay it back by June 1, 2026. He has not paid anything. I texted him twice asking for the money and he stopped answering.",
  "stated": { "amount": "\\$?4,000", "whenHappened": "March 3,? 2026", "otherParty": "Jordan Testfield", "relationship": "neighbour", "dueDate": "June 1,? 2026", "paidBack": "not paid anything", "demand": "texted him twice" },
  "neverShown": ["defamation", "Grant v. Torstar", "Libel and Slander Act", "Landlord and Tenant Board"],
  "answers": { "outcome": "I want my $4,000 back", "ownDetails": true } }
```

### Story 8b: loan to a friend, e-transfer receipt (site owner, 27 Nov 2026)

```json
{ "id": "8b", "name": "loan to Alex Testwood", "city": "Ottawa", "start": "nothing-filed",
  "story": "I lent my friend Alex Testwood $3,000 in January 2026. He promised to repay me by April 30, 2026 and hasn't paid. I have the e-transfer receipt.",
  "stated": { "amount": "\\$?3,000", "whenHappened": "January 2026", "otherParty": "Alex Testwood", "relationship": "my friend", "dueDate": "April 30,? 2026", "paidBack": "hasn't paid", "evidence": "e-transfer receipt", "paymentMethod": "e-transfer" },
  "neverShown": ["defamation", "Grant v. Torstar", "Libel and Slander Act", "Landlord and Tenant Board"] }
```

### Story 9: contractor left the kitchen half done (site owner, 27 Nov 2026)

The story states the contract price ($12,000) and what was paid ($6,000), not what is being claimed, so asking the
amount claimed is not a repeat (`contractPrice`, not `amount`).

```json
{ "id": "9", "name": "contractor half done", "city": "Ottawa", "start": "nothing-filed",
  "story": "I hired Test Fakebuild Contracting Inc. to renovate my kitchen for $12,000. We signed a contract on February 10, 2026 saying they would finish by April 15, 2026. I paid $6,000 up front. They stopped coming after two weeks and left the kitchen half done. I emailed them three times asking them to finish or refund me.",
  "stated": { "contractPrice": "\\$?12,000", "whenHappened": "February 10,? 2026", "otherParty": "Fakebuild", "whatFor": "renovate my kitchen", "agreementInWriting": "signed a contract", "finishDate": "April 15,? 2026", "paidUpFront": "\\$?6,000 up front", "workDone": "half done", "demand": "emailed them three times" },
  "neverShown": ["defamation", "Grant v. Torstar", "Libel and Slander Act", "Landlord and Tenant Board"],
  "notStillToAdd": ["The work was not of a reasonably acceptable quality, or was not finished"] }
```

## The PASS/FAIL table

One row per screen, per story. The run writes it to `table.md`; the Chrome tester fills the same columns by hand.

| Story | Step | Screen | Rule | PASS/FAIL | What was seen |
|---|---|---|---|---|---|
| 7 | T7-01 | Home | (b) | | |
