# The 18 blocks a person needs to finish

For whoever picks up the content work — you, or the licensee, or both.

Each entry says where the user is, what they are asking, what the pipeline
could not say and why, and what it would take to fix. No legal knowledge is
assumed; where a rule is quoted it is quoted from the vendored corpus.

**How this is ordered.** By how many cases structurally pass through each
point, not by measured usage — we have no usage data and inventing a ranking
would be worse than admitting that. The basis is the rules themselves: `r.
13.01 (1)` says "A settlement conference shall be held in every defended
action", so every defended case reaches that stage; every served case passes
through a waiting period; and so on. The situational ones (a slip on ice, a
missed hearing) come lower because fewer people reach them — **not because they
matter less.** The notice blocks in particular are the highest-consequence
content in the product.

---

## Update — what genuinely needs a new source

**The block-by-block list below was written against an earlier run and its
counts have moved.** Read this section first: most of what that list called a
source gap was not one.

### Three defects of mine were hiding the sources

| What | Effect |
|---|---|
| Guides truncated to 7,000 characters | `guide-getting-ready-for-court` is 45,269. Of 61 mentions of "witness", **one** fell inside the window. |
| The window was mostly page furniture | ontario.ca pages open with "Skip to main content", "Ontario.ca needs JavaScript", "Log in to continue". The drafter was reading a JavaScript warning. |
| Three stage-to-guide mapping gaps | `assessment-of-damages-needed` had **no** practical source; `plaintiff:defence-filed` got the *defendant's* replying guide; `six-month-service-window-expired` was not given the motions guide, where its answer lives. |

### And a counterintuitive result worth keeping

Passing the guides **whole** fixed the gap it targeted and made everything else
worse — the drafter writes more and more loosely, lifting guide prose that
reads above grade 8.

| Budget | verified | no-source | cost |
|---|---|---|---|
| 7,000 | 10 | 8 | $0.20 |
| 18,000 | 9 | 4 | $0.38 |
| 60,000 | 9 | 3 | $0.57 |

**Do not read the 7,000-character row as the best one.** A `no-source` block
tells the user "the rules do not set out a step for this". At 7,000 characters
eight blocks said that while the guide *did* set it out, past the cutoff — a
false statement to a user, and worse than an honest `needs-human`. Raising the
budget converted fake no-source blocks into visible failures. The setting is
18,000, chosen by measuring: one mention of "witness" at 7,000, eight at
18,000, and nothing the checks could detect from the remaining 42,000.

Counts also vary run to run — verified-draft has been 15, 10, 10, 9, 9 on the
same code. A single run is not a measurement.

### The six that survive

Four `no-source` blocks and two `needs-human` sections. For each, what would
actually close it:

**1. `both:filed-in-wrong-place` — "is my case in the wrong court?"**
The clearest real gap, and it held when gpt-4o reached the same conclusion
independently and wrote NOT_SUPPORTED. `r. 6.01 (1)` says where an action
**shall be commenced**; `r. 6.01 (3)` says that if a judge finds the place wrong
when the action is called, the court **may order** it tried elsewhere. That is
what a judge does, not what a person does now.
**Needed:** an official page on transferring a Small Claims action between
territorial divisions, or confirmation that the only route is to wait for the
court to raise it. Until then this stays `no-source` and points at the court
office.

**2. `before-filing:claim-exceeds-small-claims-limit` — "my claim is over the limit"**
Half-sourced. ontario.ca says you may waive the excess and stay in Small Claims.
Nothing vendored covers the other route.
**Needed:** the Rules of Civil Procedure (O. Reg. 194/90) or an ontario.ca guide
to starting a Superior Court action — **neither is in the corpus**, because the
product is Small Claims only. Also unclear whether waiving requires particular
wording in the claim.

**3. `plaintiff:action-dismissed-for-delay` — "the court dismissed my case"**
`r. 11.1.01` says the clerk dismisses and serves the order. `r. 11.1.02` covers
a defendant's claim being deemed dismissed 60 days later. Nothing says what the
plaintiff can do.
**Needed:** an official source on whether a clerk's dismissal for delay can be
set aside or the action restored, and how.

**4. `plaintiff:six-month-service-window-expired` — "I never served them"**
"What to do next" is now sourced — a motion to extend time, since `r. 8.01 (2)`
lets the court extend "before or after the six months has elapsed". Only "what
happens after" is missing.
**Needed:** what follows an extension motion. Low value; the block is useful
without it.

**5. `before-filing:notice-municipality` — "do I have to tell the city first?"**
"What happens after" is empty because giving notice does not *start* anything —
it preserves the ability to sue. That is a **structure** problem, not a source
gap: the honest content is already sourced (the limitation period still runs).
**Needed:** nothing. Compose it from what is already cited.

**6. `before-filing:limitation-period-may-have-passed` — "am I out of time?"**
**This one should probably stay `no-source` permanently.** The Limitations Act
says what the period is and when a claim is discovered. What a person should
*do* when they may be out of time is advice about their own facts, which this
product does not give and no procedural source provides. `no-source` plus the
referrals is the correct answer here, not a gap to fill.

So: **one clear gap needing new material** (filed-in-wrong-place), **two needing
sources outside the Small Claims corpus**, one low-value, one that is a
structure fix, and one that is correctly unanswerable.

---

## First, the four things going wrong

Most of the 18 are not eighteen separate problems. Counted from the run log,
not by eye — the categories overlap, so a block can appear in more than one.

| Cause | Blocks affected | Needs a person? |
|---|---|---|
| Reading level above grade 8 | **10** | Rewriting, no research |
| Deadline written as a bare fragment | **9** | No — a pipeline bug |
| Verifier paraphrased instead of quoting | **4** | No — re-run |
| Genuinely nothing published | **4** | Yes |

### 1. Reading level — 10 blocks. No new source needed.

Ten blocks say everything correctly and say it at grade 8.1 to 12.3. The
target is grade 8. This is rewriting, not research, and it is the single
largest cause.

The usual culprit is one long sentence carrying three ideas. From
`plaintiff:awaiting-settlement-conference`, at grade 12.3:

> "At least 14 days before the settlement conference, serve on every other
> party and file with the court a copy of any document to be relied on at the
> trial, including an expert report, not attached to the party's claim or
> defence."

That is `r. 13.03 (2)` almost verbatim, which is why it is accurate and why it
reads like a regulation. It needs to become three short sentences.

### 2. A bug in the pipeline, not a gap in the sources — 9 blocks.

The deadline section is being written as a bare fragment:

> "14 days before the settlement conference date"
> "20 days from the date of service"
> "90 days from the date the defence was filed"

The verifier then rejects it, correctly, as an incomplete statement or as a
claim with no support. But the fault is mine: the section is a *label*, and I
am feeding it to a sentence-level verifier that expects sentences.

**This is not content work.** Nine of the eighteen are failing for it, and
fixing it in the pipeline is likely to convert most of them without anyone
writing a word.

**One caveat on that nine.** The categories above were counted by pattern, and
one of the nine —
`defendant:default-judgment-against-me`'s "20 calendar days from the date the
judgment was signed" — is shaped like a fragment but is substantively **a wrong
deadline that does not exist**. Fixing the fragment bug will not fix it. See
entry 10, where it is the most dangerous error on this list.

### 3. The verifier paraphrased instead of copying — 4 blocks.

In four blocks the verifier marked a sentence supported and then supplied a
quote that is not in the vendored text — because it rewrote the passage
slightly instead of copying it. The code gate caught every one.

The statements themselves look correct and the sources are present. These are
near-misses, and re-running is worth trying before anyone edits by hand.

### 4. Genuine source gaps — 4 blocks.

"What happens after" cannot be written for several stages, and
`both:filed-in-wrong-place` cannot be written at all. Nobody has published what
we would need. These are the only ones that truly require new material.

---

## The blocks

### 1. `plaintiff:served-awaiting-defence`
**"They have been served — how long do I have to wait to hear back?"**

Every case that gets served passes through this.

| Rejected | Why |
|---|---|
| "You should wait for the defendant to respond within this period." | The source describes the time to serve and file a defence. It does not tell the plaintiff to wait. |
| "20 days from the date of service" | `r. 3.01` counts time by excluding the first day and including the last — so it is not simply "from the date of service". |
| *what happens after* | Could not be written from the sources. |

**To fix:** the second is the fragment bug (#2). The third needs the two
branches spelled out — if a defence arrives, a settlement conference follows
(`r. 13.01`); if it does not, the clerk may note the defendant in default
(`r. 11.01 (1)`). Both rules are already in the stage map for this stage.

### 2. `plaintiff:defence-filed`
**"They filed a defence — what happens next?"**

Every defended case.

| Rejected | Why |
|---|---|
| "90 days from the date the first defence is filed" | Fragment — read as a claim with nothing supporting it. |
| *what happens after* | Could not be written from the sources. |

**To fix:** fragment bug, plus "what happens after" needs the settlement
conference described. `r. 13.01 (3)` is already cited here.

### 3. `defendant:defence-filed`
**"I filed my defence — what happens next?"**

| Rejected | Why |
|---|---|
| "90 days from the date the defence was filed" | `r. 13.01 (3)` says within 90 days after **the first** defence is filed. With several defendants those are different dates. |
| "You will receive a notice with the date and time of the settlement conference." | The source does not say this. |
| grade 8.1 | Just over. |

**To fix:** the first is a real precision catch worth keeping — "the first
defence" matters. The second is true and sourceable: `r. 13.01 (2)` says the
clerk fixes the time and place and serves a notice of settlement conference.
**That rule is not in this stage's citation list, which is why the drafter
could not use it.** Adding it is a one-line change.

### 4. `plaintiff:awaiting-settlement-conference`
### 5. `defendant:awaiting-settlement-conference`
**"I have a settlement conference date — what do I have to send in, and when?"**

`r. 13.01 (1)`: a settlement conference is held in **every** defended action, so
both sides of every defended case land here.

| Rejected | Why |
|---|---|
| "14 days before the settlement conference date" | Fragment. |
| grade 12.3 / 12.1 | The `r. 13.03 (2)` sentence quoted above. |

**To fix:** fragment bug, then rewrite one sentence into three. No research.
These two are the closest to done of anything on the list.

### 6. `plaintiff:defendant-noted-in-default`
**"They have been noted in default — how do I get my judgment?"**

| Rejected | Why |
|---|---|
| grade 8.6 | One long sentence, nothing else wrong. |

**To fix:** split this sentence and the block is finished:

> "If the clerk signs the default judgment, it will be in respect of the claim
> or any part of the claim that is for a debt or liquidated demand in money,
> including interest if claimed."

### 7. `defendant:considering-defendants-claim`
**"They owe me money too — can I sue them back in the same case?"**

| Rejected | Why |
|---|---|
| "You **must** issue your Defendant's Claim within 20 days…" | `r. 10.01 (2)` says it **may** be issued within 20 days — and after that, before trial or default judgment, **with leave of the court**. |
| "20 days from the day your Defence is filed" | Fragment. |
| "The court will handle both claims together." | Not stated in the sources given. |

**Worth pausing on the first.** "Must" instead of "may" would tell someone at
day 25 that they had lost a claim they can still bring with leave. That is a
person abandoning a claim because of a word we chose. The verifier caught it.

**To fix:** rewrite with "may", and add `r. 10.04 (1)` — a defendant's claim is
tried and disposed of at the trial of the action unless the court orders
otherwise — to support the third sentence. Not currently cited here.

### 8. `plaintiff:served-with-defendants-claim`
**"They are suing me back — do I have to respond to that too?"**

| Rejected | Why |
|---|---|
| "You have been served with a defendant's claim." | The verifier objected that the source says the *plaintiff* was served. |
| "20 days from the date you were served with the defendant's claim." | The verifier read the source as giving 20 days from the plaintiff's claim. |

**Read this one carefully before editing.** The stage is the plaintiff being
served with a defendant's claim, and `r. 10.03` does give 20 days after service
of the defendant's claim. **The verifier appears to have got this wrong**, not
the draft. Worth a human eye on the source before anything is changed — and if
the draft was right, that is a verifier false-positive worth recording.

### 9. `plaintiff:assessment-of-damages-needed`
**"The clerk says my claim is not for a fixed amount — how do I prove what I am owed?"**

| Rejected | Why |
|---|---|
| *what happens after* | Could not be written from the sources. |
| grade 9.2 | One long sentence about the notice of motion. |

**To fix:** `r. 11.03 (2)` gives the two routes (a motion in writing with
Form 15A, or a request for an assessment hearing which may be in Form 9B) but
says nothing about what follows either. An official source for what happens at
an assessment hearing would be needed — or the block honestly says the rules do
not set it out.

### 10. `defendant:default-judgment-against-me`
**"There is a judgment against me and I never knew about the case — what can I do?"**

Lower on this list only because fewer people reach it. For those who do it is
among the most frightening positions in the product.

| Rejected | Why |
|---|---|
| "You **should** prepare a motion to set aside…" | `r. 11.06` says the court **may** set aside if the party **makes** a motion. "Should prepare" overstates. |
| "20 calendar days from the date the judgment was signed." | **Wrong.** The source gives 20 days to serve and file a *defence*. It is not a deadline to set aside. |

**The second is the most dangerous single error the verifier caught.**
`r. 11.06` sets **no fixed number of days** — it requires the motion be "made as
soon as is reasonably possible in all the circumstances". Inventing a 20-day
limit would tell someone on day 25 that they had missed a deadline that does
not exist, and they would stop.

**To fix:** no new source. State that there is no fixed period and quote the
"as soon as is reasonably possible" test.

### 11. `defendant:judgment-against-me`
**"I lost — what happens now, and what if I cannot pay?"**

| Rejected | Why |
|---|---|
| "This means the court has ordered you to pay a certain amount." | Not stated. |
| "You can also ask the court to set aside the judgment if it was obtained by default." | Verifier quoted a passage not in the corpus (#3). |

**To fix:** the second is true and sourceable from `r. 11.06`, which is not
cited on this stage. Add it. The first should probably just go — it explains a
word rather than saying anything.

### 12. `before-filing:notice-municipality`
**"I was hurt because a road or sidewalk was in bad repair — do I have to tell the city first?"**

**Read the spot-check guide on these three before touching them.** They are the
only deadlines in the product where missing it means there is no action at all,
and they are the ones a self-represented person is least likely to know exist.

| Rejected | Why |
|---|---|
| Two sentences about giving written notice to the clerk | Verifier paraphrased rather than quoted (#3). The statements match `s. 44 (10)`. |
| "Prepare your written notice to the clerk." / "Include all required details." | Instructions with no fact in them — they restate the heading. |
| "Send the notice by registered mail or deliver it in person." | `s. 44 (10)` says served upon **or** sent by registered mail to the clerk. "Deliver it in person" is not the same as personal service and was not stated. |
| grade 10.2 | |

**To fix:** mostly re-running plus a rewrite. Nothing missing from the sources.
Whoever finishes it must keep **both** exceptions (`s. 44 (11)` death, `s. 44
(12)` reasonable excuse and no prejudice) and the `s. 44 (9)` sidewalk
near-immunity, which decides more slip cases than the notice does.

### 13. `before-filing:notice-toronto`
**"I was hurt on a Toronto street or sidewalk — do I have to tell the City first?"**

| Rejected | Why |
|---|---|
| "You need to give written notice to the City of Toronto…" | Paraphrased quote (#3). |
| "Prepare your written notice with the required details." | The source does not say how to prepare it. |
| "Ensure it is served or sent to the city clerk." | Hair-splitting by the verifier, but the sentence adds nothing. |
| grade 8.4 | |

**To fix:** rewrite and re-run. Note the pinpoint is `s. 42 (6)`, not s. 42.

### 14. `before-filing:notice-snow-ice-private`
**"I slipped on ice outside a shop or building — is there something I have to send before I sue?"**

| Rejected | Why |
|---|---|
| Three sentences about the 60-day notice and who it goes to | All paraphrased quotes (#3). The statements match `s. 6.1 (1)` and `s. 6.1 (2)`. |
| "Prepare your written notice with the required details." | Restates the heading. |
| "60 days from the date of the injury" | Fragment. |
| grade 9.7 | |

**To fix:** re-run and rewrite. This is the block whose absence caused the
original error recorded in SOURCING_NOTES — the product told people about the
two-year limitation period and never mentioned the 60 days.

### 15. `both:missed-settlement-conference`
**"I missed my settlement conference — what happens to me now?"**

| Rejected | Why |
|---|---|
| "You should wait for any communication from the court…" | Not stated. |
| "Be prepared for the possibility of sanctions…" | The source describes what the court **may** do; it does not tell the reader to brace for it. |
| grade 9.7 | |

**To fix:** no new source. `r. 13.02 (5)` and `(6)` are cited here and say what
the court may do. Say that plainly and drop the advice about how to feel.

### 16. `both:missed-trial`
**"I missed my trial date — is my case over?"**

| Rejected | Why |
|---|---|
| "You may want to check with the court about the next steps." | Filler. |
| "You can inquire about the status of your case…" | Filler. |
| "If the trial proceeded without you, the judge **may have made** a decision." | `r. 17.01 (2)` lists what the judge **may** do; it does not say what happened in this case. |

**To fix:** no new source. `r. 17.01 (2)` is cited and is specific about the
consequences for each side. State those.

### 17. `plaintiff:action-dismissed-for-delay`
**"The court dismissed my case for delay — can I do anything about it?"**

| Rejected | Why |
|---|---|
| "You may consider making a motion to the court." | Not stated in the sources given. |
| "The time to file your motion is counted from the date of the dismissal." | Not stated. |

**To fix:** `r. 11.1.01` says the clerk shall dismiss and shall serve the order.
It does not say what a plaintiff can do next. An official source is needed — or
this becomes a `no-source` block. Note `r. 11.1.02`, already vendored, says a
defendant's claim is deemed dismissed 60 days after that order is served unless
the court orders otherwise, which is worth surfacing to a defendant.

### 18. `both:filed-in-wrong-place`
**"I think the case is in the wrong court or the wrong city — does that matter?"**

**The clearest genuine gap in the product.**

| Rejected | Why |
|---|---|
| "You may need to file a motion to address the issue…" | Not stated anywhere in the sources. |
| *what happens after* | Could not be written. |
| grade 9.3 | |

`r. 6.01 (1)` says where an action **shall be commenced**. `r. 6.01 (3)` says
that if, when the action is called for trial or a conference, the judge finds
the place is wrong, the court **may order** it tried elsewhere — which is about
what a judge does, not what a person can do about it now.

**Nothing published says how to fix having filed in the wrong place.** Either
someone finds a source we have not, or this stays a `no-source` block saying so
and pointing at the court office. Given that gpt-4o reached the same conclusion
independently and honestly wrote NOT_SUPPORTED, the gap is probably real.

---

## What to do first

1. **Fix the deadline-fragment bug** in the pipeline and re-run. Nine blocks
   are failing on it and none of them need a human.
2. **Re-run the four paraphrased-quote blocks.** The sources are present; the
   verifier simply did not copy.
3. **Add the missing citations** named above — `r. 13.01 (2)`, `r. 10.04 (1)`,
   `r. 11.06` on the judgment-against-me stage. Each is one line in the stage
   map and each unblocks a rejected sentence.
4. **Then rewrite for reading level.** What is left after the first three steps
   is mostly splitting long sentences.
5. **Look at `plaintiff:served-with-defendants-claim`** — the verifier may have
   been wrong, and if so that is worth knowing about the verifier.
6. **Decide about `both:filed-in-wrong-place`** — find a source, or accept it as
   `no-source` and say so honestly.

Steps 1 to 3 are engineering and cost almost nothing to try. It is worth doing
them before anyone spends an afternoon writing content by hand.
