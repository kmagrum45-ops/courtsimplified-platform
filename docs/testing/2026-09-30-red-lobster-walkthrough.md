# Site owner walk-through — 2026-09-30 — "Red Lobster suit"

The site owner ran one story through the live guided Small Claims intake and
reported what he saw, prompt by prompt. Every item is recorded here with what
was done about it, so nothing he noticed is lost between sessions.

**Story typed:** "i went to red lobster with my wife and the waiter dropped a
tray of food on me and it stained my new suit that cost me 1500 dollars. i
tried to get it cleaned but the stains wont come out. can i sue redlobster?"

| # | Where | What he saw | Verdict | Status |
|---|---|---|---|---|
| 1 | Opening story | "We can't answer that" notice + referral list for "can i sue redlobster?" | Correct under today's rules. Owner wants the A2I-approved version to explain the relevant concept and map his facts to it (`claimElementMapping` switch). | Open — build the approval-tier answer behind the switch for the A2I demo |
| 2 | First "Here's what I understood" card | Dispute type proposed as "Property damage", quoting the story | Good — owner likes it | — |
| 3 | Second card | "Your answers opened a few more questions…" then role proposed as plaintiff from "can i sue redlobster?" | Good — owner likes the confirm step even when obvious. The role was not in the first card, only the re-read; worth checking why the first read missed it | Watch |
| 4 | "What outcome are you asking the court to order?" | No examples shown | **Bug.** Four reviewed examples exist in the bank (`sc-remedy-sought`); `QuestionHelp` rendered only `why`. Now renders `examples` for every question. Note: the court orders money or the return of property (CJA s. 23 (1) (a), (b)), not replacement of an item — the existing examples already say that | Fixed 2026-09-30 |
| 5 | Claim type | No Small Claims claim type fits "a business's employee damaged my property"; only "damaged while in the business's care" | Gap | Open — add a sourced claim type |

| 6 | Summary page | "Situations that usually belong somewhere other than Small Claims" listed the auto-insurance direct-compensation rule for a stained suit | **Owner's rule: the summary is about the user's case.** An entry now shows only when the user confirmed the claim type it concerns, or recorded an amount over $50,000 | Fixed 2026-09-30 |
| 7 | Summary page | "Issues to review: Possible issue to review: property-damage. The saved facts… should be reviewed." and "What important fact should be confirmed next?" | Generic boxes that say nothing. Now shown only when they carry something specific | Fixed 2026-09-30 |
| 8 | Summary page | "Evidence you have recorded" repeated his own answer; "No filed or served documents were selected" | Read-back. The evidence answer moved under "What you told us"; the empty documents box is hidden | Fixed 2026-09-30 |
| 9 | Summary page | Nowhere to upload the receipt and photos | **Missing feature.** The server upload path existed; no screen had a button. New "Add your documents and photos" card on the summary. Needs the 2026-09-27 workspace migrations on production to work there | Built 2026-09-30; live once migrations are applied |

Continue the table as the walk-through goes on.
