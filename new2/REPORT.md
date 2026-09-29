# Story review report

Generated 2026-09-29T19:58:15.876Z.
Stories: 14. Checks failed: 6.

| Story | Route | Safety | Claim type | Questions | Depth | Review items | Failed checks |
|---|---|---|---|---|---|---|---|
| SC1-contractor-quit-customer | mixed | clear | sc-claim-breach-of-contract-services (suggested) | 6 (+4 offered) | 3 | 10 | court-path |
| SC2-freelance-invoice | small-claims | clear | sc-claim-unpaid-debt-services | 5 (+3 offered) | 3 | 7 | none |
| SC3-loan-to-friend | small-claims | clear | sc-claim-personal-loan-between-individuals (suggested) | 3 (+5 offered) | 2 | 9 | already-answered |
| SC4-used-car-dealer | small-claims | clear | sc-claim-used-vehicle-nondisclosure (suggested) | 5 (+3 offered) | 4 | 8 | none |
| SC5-facebook-post | civil | clear | sc-claim-defamation-libel-slander (suggested) | 6 (+3 offered) | 3 | 9 | court-path |
| SC6-dog-bite | small-claims | clear | sc-claim-dog-bite-animal-injury | 6 (+3 offered) | 3 | 8 | none |
| SC7-contractor-being-sued | mixed | clear | - | 11 (+4 offered) | 0 | 7 | court-path, unscripted-questions |
| SC8-sued-on-loan-part-owed | small-claims | clear | - | 8 (+5 offered) | 0 | 4 | unscripted-questions |
| SC9-threat-buried | small-claims | immediate-danger (stopped) | - | 0 (+0 offered) | 0 | - | none |
| CV1-renovation-over-limit | civil | clear | - | 0 (+0 offered) | 0 | - | none |
| CV2-fired-after-12-years | small-claims | clear | - | 0 (+0 offered) | 0 | - | none |
| FM1-separation-parenting | family | clear | - | 0 (+0 offered) | 0 | - | none |
| FM2-served-motion-to-change | family | clear | - | 0 (+0 offered) | 0 | - | none |
| TR1-tenant-mould | out-of-scope (ltb) | clear | - | 0 (+0 offered) | 0 | - | none |

## Failed checks

- **SC1-contractor-quit-customer** -- court-path: routed to "mixed", expected small-claims
- **SC3-loan-to-friend** -- already-answered: asked "sc-orient-role" although the story answers it (not offered from the story)
- **SC5-facebook-post** -- court-path: routed to "civil", expected small-claims
- **SC7-contractor-being-sued** -- court-path: routed to "mixed", expected small-claims
- **SC7-contractor-being-sued** -- unscripted-questions: asked questions the script did not anticipate: sc-date-claim-served, sc-date-claim-issued, sc-date-learned-of-default, sc-date-learned-of-judgment
- **SC8-sued-on-loan-part-owed** -- unscripted-questions: asked questions the script did not anticipate: sc-date-learned-of-default

## Each story, as the user saw it

### SC1-contractor-quit-customer

_The site owner's own manual test, rewritten: customer v. Kijiji contractor who quit halfway._

> I hired a guy off Kijiji in May to redo my bathroom. I paid him a $2000 deposit by e-transfer. He did about half the job, ripped out the old tub and put up some of the tile, then stopped showing up. I texted him for weeks and he never answered. I had to hire another contractor who charged me 3200 to finish it, and he pointed out that the first guy cracked a bunch of the tiles and put a hole in the drywall in the hallway. When I finally reached the first guy he said the tiles were already cracked when he got there, which is not true. I want to take him to small claims. I haven't filed anything yet.

- [proposal] `sc-orient-when-happened` Roughly when did the situation that led to this claim happen? -> May  (from: "I hired a guy off Kijiji in May")
- [proposal] `sc-orient-role` Are you the person or business bringing this claim, or the one responding to a claim? -> Bringing the claim (plaintiff)  (from: "I want to take him to small claims.")
- [proposal] `sc-orient-dispute-category` What kind of dispute is this? -> Work or a service you paid for (e.g. a contractor)  (from: "I hired a guy off Kijiji in May to redo my bathroom.")
- [proposal] `sc-claim-filed` Has a Plaintiff's Claim (Form 7A) already been filed with the court? -> No, I haven't filed anything yet.  (from: "I haven't filed anything yet.")
- [question] `sc-amount-claimed` What is the total dollar amount you are claiming?
- [question] `sc-contractor-completion-date` Was a date agreed for the work to be finished? If so, what was it?
- [question] `sc-contractor-notice-before-replacement` Before hiring anyone else to finish or fix the work, did you tell the original contractor about the problem and give them a chance to respond?
- [question] `sc-evidence-available` What evidence do you have to support your claim (documents, photos, messages, receipts, witnesses)?
- [question] `sc-remedy-sought` What outcome are you asking the court to order?
- [question] `sc-safety-check` Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?
- [depth] `depth-services-agreement` What work did you agree to, and how was it agreed?
- [depth] `depth-services-what-done` What was actually done, and how did it differ from what you agreed?
- [depth] `depth-services-loss` What did this cost you, and how did you work that out?
- [review] `missing-your-name` Your full legal name isn't in your case file yet. The rules say a Plaintiff's Claim must contain the full names of the parties.
- [review] `missing-other-party-name` The other party's full name isn't in your case file yet. The rules say a Plaintiff's Claim must contain the full names of the parties. If it's a business, its exact legal name is worth finding.
- [review] `missing-other-party-address` There's no address for the other party yet. The rules say a Plaintiff's Claim must give the address where you believe the defendant can be served.
- [review] `amount-not-a-figure` The amount you recorded isn't a single figure yet. The rules say a Plaintiff's Claim must state the amount of the claim. If part of it is still unknown, a written quote or estimate can help you settle on a number.
- [review] `date-approximate` “in May” -- if you can find the exact date (for example, from a message, receipt or calendar), adding it will keep your timeline accurate.
- [review] `document-mentioned` You mentioned “paid him a $2000 deposit”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `document-mentioned` You mentioned “texted him for weeks”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `document-mentioned` You mentioned “charged me 3200”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `document-mentioned` You mentioned “cracked a bunch of the tiles”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `document-mentioned` You mentioned “put a hole in the drywall in the hallway”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.

Facts recorded: role="plaintiff", disputeCategory="work-or-services", claimFiled=false, timelineText="May", amountClaimedText="About $5,200 -- the $2000 deposit plus the $3200 to finish."

- **FAIL** court-path: routed to "mixed", expected small-claims
- PASS safety: got "clear", expected clear
- PASS claim-type: suggested "sc-claim-breach-of-contract-services", expected sc-claim-contractor-damage or sc-claim-breach-of-contract-services
- PASS already-answered: "sc-orient-role" offered back from the story
- PASS already-answered: "sc-orient-when-happened" offered back from the story
- PASS already-answered: "sc-claim-filed" offered back from the story
- PASS side: recorded role "plaintiff", expected "plaintiff"; proposal said "Bringing the claim (plaintiff)"
- PASS review-raises: raised document-mentioned quoting "charged me 3200"
- PASS review-raises: raised missing-other-party-name
- PASS review-raises: raised missing-other-party-address
- PASS no-grading-language: no blocked term in anything shown
- PASS unscripted-questions: every question asked was one this person could answer from the script

### SC2-freelance-invoice

_Plain unpaid invoice; the case that tripped the safety check in CI._

> I'm a freelance web developer. Back in April, I built a full website for a small business owner and delivered the finished site along with all the source files. We'd agreed by email that they'd pay me $3,200 within 30 days of delivery. It's now been over three months, they haven't paid me anything, and they've stopped responding to my emails about the unpaid invoice.

- [proposal] `sc-orient-when-happened` Roughly when did the situation that led to this claim happen? -> April  (from: "Back in April")
- [proposal] `sc-orient-dispute-category` What kind of dispute is this? -> Unpaid money owed to you  (from: "they haven't paid me anything")
- [proposal] `sc-evidence-available` What evidence do you have to support your claim (documents, photos, messages, receipts, witnesses)? -> An email agreement to pay me $3,200 within 30 days of delivery, and my emails about the unpaid invoice.  (from: "We'd agreed by email that they'd pay me $3,200 within 30 days of delivery.")
- [question] `sc-orient-role` Are you the person or business bringing this claim, or the one responding to a claim?
- [question] `sc-amount-claimed` What is the total dollar amount you are claiming?
- [question] `sc-claim-filed` Has a Plaintiff's Claim (Form 7A) already been filed with the court?
- [question] `sc-remedy-sought` What outcome are you asking the court to order?
- [question] `sc-safety-check` Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?
- [depth] `depth-debt-agreement` How was the arrangement with the other party set up?
- [depth] `depth-debt-work-done` What did you provide, and when?
- [depth] `depth-debt-amount-unpaid` Has any part of the amount been paid?
- [review] `missing-your-name` Your full legal name isn't in your case file yet. The rules say a Plaintiff's Claim must contain the full names of the parties.
- [review] `missing-other-party-name` The other party's full name isn't in your case file yet. The rules say a Plaintiff's Claim must contain the full names of the parties. If it's a business, its exact legal name is worth finding.
- [review] `missing-other-party-address` There's no address for the other party yet. The rules say a Plaintiff's Claim must give the address where you believe the defendant can be served.
- [review] `document-mentioned` You mentioned “delivered the finished site along with all the source files”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `document-mentioned` You mentioned “agreed by email that they'd pay me $3,200”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `document-mentioned` You mentioned “they've stopped responding to my emails”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `date-approximate` “Back in April” -- if you can find the exact date (for example, from a message, receipt or calendar), adding it will keep your timeline accurate.

Facts recorded: role="plaintiff", disputeCategory="unpaid-money", timelineText="April", amountClaimedText="$3,200.", claimFiled=false, remedySoughtText="Payment of the invoice."

- PASS court-path: routed to "small-claims", expected small-claims
- PASS safety: got "clear", expected clear
- PASS claim-type: matched "sc-claim-unpaid-debt-services", expected sc-claim-unpaid-debt-services
- PASS already-answered: "sc-orient-when-happened" offered back from the story
- PASS side: recorded role "plaintiff", expected "plaintiff"
- PASS review-raises: raised missing-other-party-address
- PASS no-grading-language: no blocked term in anything shown
- PASS unscripted-questions: every question asked was one this person could answer from the script

### SC3-loan-to-friend

_Personal loan, casual voice, partial repayment._

> so last fall my buddy asked to borrow 4500 for his truck payments, said hed pay me back by christmas. i sent it in three etransfers. he paid back 500 in january and nothing since. now hes saying it was more like a gift because i was helping him out. it wasnt a gift, i have texts where he says 'ill get u back asap'. i want the rest back.

- [proposal] `sc-orient-when-happened` Roughly when did the situation that led to this claim happen? -> Last fall.  (from: "last fall my buddy asked to borrow 4500")
- [proposal] `sc-orient-dispute-category` What kind of dispute is this? -> A loan or debt  (from: "my buddy asked to borrow 4500 for his truck payments")
- [proposal] `sc-amount-claimed` What is the total dollar amount you are claiming? -> 4000  (from: "borrow 4500 for his truck payments, said hed pay me back by christmas. i sent it in three etransfers. he paid back 500 in january and nothing since.")
- [proposal] `sc-evidence-available` What evidence do you have to support your claim (documents, photos, messages, receipts, witnesses)? -> I have texts where he says 'ill get u back asap'.  (from: "i have texts where he says 'ill get u back asap'")
- [proposal] `sc-remedy-sought` What outcome are you asking the court to order? -> I want the rest of the money back.  (from: "i want the rest back.")
- [question] `sc-orient-role` Are you the person or business bringing this claim, or the one responding to a claim?
- [question] `sc-claim-filed` Has a Plaintiff's Claim (Form 7A) already been filed with the court?
- [question] `sc-safety-check` Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?
- [depth] `depth-loan-agreement` What was said or written about repaying the money?
- [depth] `depth-loan-unpaid` Has any of it been repaid?
- [review] `missing-your-name` Your full legal name isn't in your case file yet. The rules say a Plaintiff's Claim must contain the full names of the parties.
- [review] `missing-other-party-name` The other party's full name isn't in your case file yet. The rules say a Plaintiff's Claim must contain the full names of the parties. If it's a business, its exact legal name is worth finding.
- [review] `missing-other-party-address` There's no address for the other party yet. The rules say a Plaintiff's Claim must give the address where you believe the defendant can be served.
- [review] `document-mentioned` You mentioned “i sent it in three etransfers”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `document-mentioned` You mentioned “he paid back 500”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `document-mentioned` You mentioned “he says 'ill get u back asap'”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `date-approximate` “last fall” -- if you can find the exact date (for example, from a message, receipt or calendar), adding it will keep your timeline accurate.
- [review] `date-approximate` “by christmas” -- if you can find the exact date (for example, from a message, receipt or calendar), adding it will keep your timeline accurate.
- [review] `date-approximate` “in january” -- if you can find the exact date (for example, from a message, receipt or calendar), adding it will keep your timeline accurate.

Facts recorded: role="plaintiff", disputeCategory="loan-or-debt", timelineText="Last fall.", amountClaimedText="4000", evidenceText="I have texts where he says 'ill get u back asap'.", remedySoughtText="I want the rest of the money back.", claimFiled=false

- PASS court-path: routed to "small-claims", expected small-claims
- PASS safety: got "clear", expected clear
- PASS claim-type: suggested "sc-claim-personal-loan-between-individuals", expected sc-claim-personal-loan-between-individuals
- **FAIL** already-answered: asked "sc-orient-role" although the story answers it (not offered from the story)
- PASS side: recorded role "plaintiff", expected "plaintiff"
- PASS review-raises: raised document-mentioned
- PASS no-grading-language: no blocked term in anything shown
- PASS unscripted-questions: every question asked was one this person could answer from the script

### SC4-used-car-dealer

_Used vehicle bought from a dealer; prior accident not disclosed._

> In July I bought a 2018 Honda Civic from a used car dealership in Hamilton for $14,900. Two months later a body shop told me it had been in a major accident and the frame had been repaired. The dealer never told me that and the bill of sale doesn't mention it. I went back and they said all sales are final. The body shop says the car is worth about $4,000 less because of the accident history.

- [proposal] `sc-orient-when-happened` Roughly when did the situation that led to this claim happen? -> In July  (from: "In July I bought a 2018 Honda Civic")
- [proposal] `sc-orient-dispute-category` What kind of dispute is this? -> A vehicle-related dispute  (from: "I bought a 2018 Honda Civic from a used car dealership")
- [proposal] `sc-evidence-available` What evidence do you have to support your claim (documents, photos, messages, receipts, witnesses)? -> I have the bill of sale, which doesn't mention the accident.  (from: "the bill of sale doesn't mention it")
- [question] `sc-orient-role` Are you the person or business bringing this claim, or the one responding to a claim?
- [question] `sc-amount-claimed` What is the total dollar amount you are claiming?
- [question] `sc-claim-filed` Has a Plaintiff's Claim (Form 7A) already been filed with the court?
- [question] `sc-remedy-sought` What outcome are you asking the court to order?
- [question] `sc-safety-check` Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?
- [depth] `depth-vehicle-disclosure` What were you told about the vehicle's history before you bought it, and what did you find out afterwards?
- [depth] `depth-vehicle-delivery-date` When did you actually receive the vehicle?
- [depth] `depth-vehicle-cancellation-date` If you have told the dealer you are cancelling the contract, when did you tell them?
- [depth] `depth-vehicle-loss` What has this cost you, and how did you work that out?
- [review] `missing-your-name` Your full legal name isn't in your case file yet. The rules say a Plaintiff's Claim must contain the full names of the parties.
- [review] `missing-other-party-name` The other party's full name isn't in your case file yet. The rules say a Plaintiff's Claim must contain the full names of the parties. If it's a business, its exact legal name is worth finding.
- [review] `missing-other-party-address` There's no address for the other party yet. The rules say a Plaintiff's Claim must give the address where you believe the defendant can be served.
- [review] `document-mentioned` You mentioned “bought a 2018 Honda Civic”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `document-mentioned` You mentioned “the frame had been repaired”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `document-mentioned` You mentioned “the car is worth about $4,000 less”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `date-approximate` “In July” -- if you can find the exact date (for example, from a message, receipt or calendar), adding it will keep your timeline accurate.
- [review] `date-approximate` “Two months later” -- if you can find the exact date (for example, from a message, receipt or calendar), adding it will keep your timeline accurate.

Facts recorded: role="plaintiff", disputeCategory="vehicle-dispute", timelineText="In July", evidenceText="I have the bill of sale, which doesn't mention the accident.", amountClaimedText="$4,000.", claimFiled=false, remedySoughtText="I want my money back."

- PASS court-path: routed to "small-claims", expected small-claims
- PASS safety: got "clear", expected clear
- PASS claim-type: suggested "sc-claim-used-vehicle-nondisclosure", expected sc-claim-used-vehicle-nondisclosure or sc-claim-consumer-protection-act-issue
- PASS already-answered: "sc-orient-when-happened" offered back from the story
- PASS side: recorded role "plaintiff", expected "plaintiff"
- PASS review-raises: raised document-mentioned
- PASS no-grading-language: no blocked term in anything shown
- PASS unscripted-questions: every question asked was one this person could answer from the script

### SC5-facebook-post

_Defamation on social media about a small business owner._

> A former client posted on a local Facebook group with 20,000 members saying my cleaning company steals from customers. That's completely false. Since the post in August I've lost three regular clients who told me they saw it. I asked her to take it down and she refused. It's still up.

- [proposal] `sc-orient-when-happened` Roughly when did the situation that led to this claim happen? -> August  (from: "the post in August")
- [proposal] `sc-orient-dispute-category` What kind of dispute is this? -> Something said about you (defamation)  (from: "saying my cleaning company steals from customers")
- [proposal] `sc-defamation-publication-details` What exact words were said or written, who received or saw them, and when did that happen? -> A former client posted in August that my cleaning company steals from customers. It was in a local Facebook group with 20,000 members. Three regular clients told me they saw it.  (from: "A former client posted on a local Facebook group with 20,000 members saying my cleaning company steals from customers.")
- [question] `sc-orient-role` Are you the person or business bringing this claim, or the one responding to a claim?
- [question] `sc-amount-claimed` What is the total dollar amount you are claiming?
- [question] `sc-claim-filed` Has a Plaintiff's Claim (Form 7A) already been filed with the court?
- [question] `sc-evidence-available` What evidence do you have to support your claim (documents, photos, messages, receipts, witnesses)?
- [question] `sc-remedy-sought` What outcome are you asking the court to order?
- [question] `sc-safety-check` Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?
- [depth] `depth-defamation-communicated` Apart from you, who saw or heard it?
- [depth] `depth-defamation-newspaper-notice` Did this involve a newspaper or a broadcast?
- [depth] `depth-defamation-publication` Was any of this published in a newspaper or broadcast, and if so, when?
- [review] `missing-your-name` Your full legal name isn't in your case file yet. The rules say a Plaintiff's Claim must contain the full names of the parties.
- [review] `missing-other-party-name` The other party's full name isn't in your case file yet. The rules say a Plaintiff's Claim must contain the full names of the parties. If it's a business, its exact legal name is worth finding.
- [review] `missing-other-party-address` There's no address for the other party yet. The rules say a Plaintiff's Claim must give the address where you believe the defendant can be served.
- [review] `amount-not-a-figure` The amount you recorded isn't a single figure yet. The rules say a Plaintiff's Claim must state the amount of the claim. If part of it is still unknown, a written quote or estimate can help you settle on a number.
- [review] `document-mentioned` You mentioned “posted on a local Facebook group”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `document-mentioned` You mentioned “lost three regular clients”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `document-mentioned` You mentioned “asked her to take it down”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `date-approximate` “in August” -- if you can find the exact date (for example, from a message, receipt or calendar), adding it will keep your timeline accurate.
- [review] `unknown-amount-mentioned` You said “not sure how much to ask for”. A written quote or estimate would give you a figure to record.

Facts recorded: role="plaintiff", disputeCategory="defamation", timelineText="August", amountClaimedText="I'm not sure how much to ask for.", claimFiled=false, remedySoughtText="I want my money back."

- **FAIL** court-path: routed to "civil", expected small-claims
- PASS safety: got "clear", expected clear
- PASS claim-type: suggested "sc-claim-defamation-libel-slander", expected sc-claim-defamation-libel-slander
- PASS already-answered: "sc-orient-when-happened" offered back from the story
- PASS side: recorded role "plaintiff", expected "plaintiff"
- PASS review-raises: raised amount-not-a-figure
- PASS no-grading-language: no blocked term in anything shown
- PASS unscripted-questions: every question asked was one this person could answer from the script

### SC6-dog-bite

_Neighbour's dog bit the teller on a walk._

> On September 3rd my neighbour's dog got loose and bit me on the leg while I was walking on the sidewalk in front of their house. I needed stitches at the walk-in clinic and missed four days of work. The neighbour says the dog has never bitten anyone before so it's not their fault. My lost wages were about $1,100.

- [proposal] `sc-orient-when-happened` Roughly when did the situation that led to this claim happen? -> September 3rd  (from: "On September 3rd")
- [proposal] `sc-orient-dispute-category` What kind of dispute is this? -> A slip, a fall, or another injury  (from: "bit me on the leg")
- [proposal] `sc-date-injury` If this involves an injury, what date did it happen? -> September 3rd  (from: "On September 3rd")
- [question] `sc-orient-role` Are you the person or business bringing this claim, or the one responding to a claim?
- [question] `sc-amount-claimed` What is the total dollar amount you are claiming?
- [question] `sc-claim-filed` Has a Plaintiff's Claim (Form 7A) already been filed with the court?
- [question] `sc-evidence-available` What evidence do you have to support your claim (documents, photos, messages, receipts, witnesses)?
- [question] `sc-remedy-sought` What outcome are you asking the court to order?
- [question] `sc-safety-check` Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?
- [depth] `depth-dog-what-happened` What happened, and where were you when it happened?
- [depth] `depth-dog-owner` What do you know about who the dog belongs to?
- [depth] `depth-dog-loss` What did this cost you, and how did you work that out?
- [review] `missing-your-name` Your full legal name isn't in your case file yet. The rules say a Plaintiff's Claim must contain the full names of the parties.
- [review] `missing-other-party-name` The other party's full name isn't in your case file yet. The rules say a Plaintiff's Claim must contain the full names of the parties. If it's a business, its exact legal name is worth finding.
- [review] `missing-other-party-address` There's no address for the other party yet. The rules say a Plaintiff's Claim must give the address where you believe the defendant can be served.
- [review] `amount-not-a-figure` The amount you recorded isn't a single figure yet. The rules say a Plaintiff's Claim must state the amount of the claim. If part of it is still unknown, a written quote or estimate can help you settle on a number.
- [review] `document-mentioned` You mentioned “bit me on the leg”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `document-mentioned` You mentioned “needed stitches at the walk-in clinic”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `document-mentioned` You mentioned “missed four days of work”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `unknown-amount-mentioned` You said “I'm not sure how much”. A written quote or estimate would give you a figure to record.

Facts recorded: role="plaintiff", disputeCategory="personal-injury", timelineText="September 3rd", claimFiled=false, evidenceText="The clinic receipt and photos of the bite.", remedySoughtText="I want my money back."

- PASS court-path: routed to "small-claims", expected small-claims
- PASS safety: got "clear", expected clear or distress
- PASS claim-type: matched "sc-claim-dog-bite-animal-injury", expected sc-claim-dog-bite-animal-injury
- PASS already-answered: "sc-orient-when-happened" offered back from the story
- PASS side: recorded role "plaintiff", expected "plaintiff"
- PASS review-raises: raised document-mentioned
- PASS no-grading-language: no blocked term in anything shown
- PASS unscripted-questions: every question asked was one this person could answer from the script

### SC7-contractor-being-sued

_The other side of SC1: the contractor, served with a claim._

> I'm a self-employed renovator. A homeowner hired me to redo a bathroom and paid a $2000 deposit. I stopped partway because she kept changing the job and refused to pay for the extra materials. Now she's sued me in small claims for $5,200. I was served with the papers last week. The tiles were already cracked when I got there and I have photos from the first day.

- [proposal] `sc-orient-role` Are you the person or business bringing this claim, or the one responding to a claim? -> Responding to a claim (defendant)  (from: "Now she's sued me in small claims for $5,200.")
- [proposal] `sc-orient-dispute-category` What kind of dispute is this? -> A contract or agreement dispute  (from: "A homeowner hired me to redo a bathroom and paid a $2000 deposit.")
- [proposal] `sc-defendant-claim-received` When did you receive the Plaintiff's Claim, and what court documents did you receive? -> I received the papers last week.  (from: "I was served with the papers last week.")
- [proposal] `sc-defendant-response-evidence` What documents, messages, photos, receipts, or witness information do you have about your response? -> I have photos from the first day showing the tiles were already cracked when I got there.  (from: "The tiles were already cracked when I got there and I have photos from the first day.")
- [question] `sc-orient-when-happened` Roughly when did the situation that led to this claim happen?
- [question] `sc-defendant-response-facts` In your own words, which facts in the Plaintiff's Claim do you agree with, and which facts do you disagree with?
- [question] `sc-defendant-outcome` Are you only responding to the Plaintiff's Claim, or are you asking the court for an outcome of your own? Describe it in your own words.
- [question] `sc-defendant-service-method` How was the Plaintiff's Claim delivered to you -- handed to you in person, left with someone else, sent by registered mail or courier, by email, or another way? And what date did that happen?
- [question] `sc-defendant-counterclaim` Do you believe the plaintiff -- or someone else -- owes you money or is responsible for part of what happened? And have you already started your own claim about it?
- [question] `sc-defendant-admission-payment` Is there any part of this claim you accept you owe? If there is, is the difficulty the amount itself, or being able to pay it all at once?
- [question] `sc-date-claim-served` If the claim has been served, what date was it served?
- [question] `sc-date-claim-issued` If a claim has been issued by the court, what date is on it?
- [question] `sc-date-learned-of-default` If you have been noted in default, what date did you find out?
- [question] `sc-date-learned-of-judgment` If judgment was made at a hearing you did not attend, what date did you find out?
- [question] `sc-safety-check` Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?
- [review] `no-evidence-recorded` No evidence is recorded in your case file yet.
- [review] `no-claim-type-confirmed` You haven't confirmed what kind of claim this is, so the claim-specific checklists aren't shown yet.
- [review] `document-mentioned` You mentioned “paid a $2000 deposit”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `document-mentioned` You mentioned “sued me in small claims for $5,200”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `document-mentioned` You mentioned “tiles were already cracked”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `date-approximate` “last week” -- if you can find the exact date (for example, from a message, receipt or calendar), adding it will keep your timeline accurate.
- [review] `date-approximate` “Earlier this year” -- if you can find the exact date (for example, from a message, receipt or calendar), adding it will keep your timeline accurate.

Facts recorded: role="defendant", disputeCategory="contract-dispute", claimFiled=true, claimServed=true, claimReceivedText="I received the papers last week.", timelineText="Earlier this year.", defendantOutcomeText="I want the claim dismissed.", serviceMethodText="Someone handed it to me.", counterclaimIntentText="I'm not sure.", admissionAndPaymentText="No."

- **FAIL** court-path: routed to "mixed", expected small-claims
- PASS safety: got "clear", expected clear
- PASS already-answered: "sc-orient-role" offered back from the story
- PASS already-answered: "sc-claim-filed" not asked
- PASS already-answered: "sc-defendant-served" not asked
- PASS side: recorded role "defendant", expected "defendant"; proposal said "Responding to a claim (defendant)"
- PASS no-grading-language: no blocked term in anything shown
- **FAIL** unscripted-questions: asked questions the script did not anticipate: sc-date-claim-served, sc-date-claim-issued, sc-date-learned-of-default, sc-date-learned-of-judgment

### SC8-sued-on-loan-part-owed

_Defendant who admits owing part of the amount._

> My ex-roommate is suing me for $2,800 she says I owe for rent and utilities. I did owe her about $1,200 for my share of the hydro and internet, and I've told her I'll pay that, but the rest is for months after I moved out. I got served with a Plaintiff's Claim on the 10th and I don't know what to do next.

- [proposal] `sc-orient-role` Are you the person or business bringing this claim, or the one responding to a claim? -> Responding to a claim (defendant)  (from: "My ex-roommate is suing me")
- [proposal] `sc-defendant-claim-received` When did you receive the Plaintiff's Claim, and what court documents did you receive? -> I received a Plaintiff's Claim on the 10th.  (from: "I got served with a Plaintiff's Claim on the 10th")
- [proposal] `sc-defendant-response-facts` In your own words, which facts in the Plaintiff's Claim do you agree with, and which facts do you disagree with? -> I agree I owed about $1,200 for my share of hydro and internet. The rest of the $2,800 she claims is for months after I moved out.  (from: "I did owe her about $1,200 for my share of the hydro and internet, and I've told her I'll pay that, but the rest is for months after I moved out.")
- [proposal] `sc-defendant-admission-payment` Is there any part of this claim you accept you owe? If there is, is the difficulty the amount itself, or being able to pay it all at once? -> I accept I owe about $1,200 for my share of hydro and internet, and I've told her I'll pay that.  (from: "I did owe her about $1,200 for my share of the hydro and internet, and I've told her I'll pay that")
- [proposal] `sc-date-claim-served` If the claim has been served, what date was it served? -> The 10th.  (from: "I got served with a Plaintiff's Claim on the 10th")
- [question] `sc-orient-when-happened` Roughly when did the situation that led to this claim happen?
- [question] `sc-orient-dispute-category` What kind of dispute is this?
- [question] `sc-defendant-response-evidence` What documents, messages, photos, receipts, or witness information do you have about your response?
- [question] `sc-defendant-outcome` Are you only responding to the Plaintiff's Claim, or are you asking the court for an outcome of your own? Describe it in your own words.
- [question] `sc-defendant-service-method` How was the Plaintiff's Claim delivered to you -- handed to you in person, left with someone else, sent by registered mail or courier, by email, or another way? And what date did that happen?
- [question] `sc-defendant-counterclaim` Do you believe the plaintiff -- or someone else -- owes you money or is responsible for part of what happened? And have you already started your own claim about it?
- [question] `sc-date-learned-of-default` If you have been noted in default, what date did you find out?
- [question] `sc-safety-check` Is there anything about your safety, or the other party's behaviour toward you, that we should know before continuing?
- [review] `no-evidence-recorded` No evidence is recorded in your case file yet.
- [review] `no-claim-type-confirmed` You haven't confirmed what kind of claim this is, so the claim-specific checklists aren't shown yet.
- [review] `document-mentioned` You mentioned “got served with a Plaintiff's Claim”. If you have something that shows this -- a receipt, invoice, message, email or photo -- you can add it to your case file.
- [review] `date-approximate` “Earlier this year” -- if you can find the exact date (for example, from a message, receipt or calendar), adding it will keep your timeline accurate.

Facts recorded: role="defendant", disputeCategory="loan-or-debt", claimServed=true, claimReceivedText="I received a Plaintiff's Claim on the 10th.", timelineText="Earlier this year.", defenceEvidenceText="I have some messages.", defendantOutcomeText="I want the claim dismissed.", serviceMethodText="Someone handed it to me.", counterclaimIntentText="I'm not sure."

- PASS court-path: routed to "small-claims", expected small-claims
- PASS safety: got "clear", expected clear
- PASS already-answered: "sc-orient-role" offered back from the story
- PASS already-answered: "sc-claim-filed" not asked
- PASS already-answered: "sc-defendant-served" not asked
- PASS side: recorded role "defendant", expected "defendant"; proposal said "Responding to a claim (defendant)"
- PASS no-grading-language: no blocked term in anything shown
- **FAIL** unscripted-questions: asked questions the script did not anticipate: sc-date-learned-of-default

### SC9-threat-buried

_Ordinary deposit dispute with a current threat mentioned once. Must stop and show safety help._

> I paid a caterer a $900 deposit for my daughter's party and they cancelled two days before and won't refund it. When I went to their shop yesterday to ask for it back the owner followed me to my car and said he knows where I live and I'd better not come back. I'm scared to go home tonight.

- [notice] `halt` If you are in immediate danger, please call 911.

CourtSimplified is a legal information platform. It is not equipped to respond to emergencies or provide crisis support, and this intake cannot continue right now.

Other support that may help:
- Assaulted Women's Helpline: 1-866-863-0511 (toll-free), or 416-863-0511
- Fem'aide (French-language support): 1-877-336-2433 (toll-free)
- ConnexOntario mental health, addictions, and problem gambling helpline: 1-866-531-2600 (toll-free)
- To report a child who may be in need of protection: contact your local Children's Aid Society, or call police if a child is in immediate danger. There is no single province-wide number for this -- Ontario's own guidance directs people to their local society.

- PASS court-path: routed to "small-claims", expected small-claims
- PASS safety: got "immediate-danger", expected immediate-danger

### CV1-renovation-over-limit

_Construction dispute well over the Small Claims limit._

> We paid a general contractor $185,000 to build an addition on our house in Ottawa. The work stopped in March with the roof unfinished and water has been coming in since. Another builder quoted $140,000 to fix and finish it. The contractor has stopped responding and we think they have gone out of business.

- [notice] `no-guided-intake` No guided intake exists for civil yet; only routing and the safety check ran.

- PASS court-path: routed to "civil", expected civil
- PASS safety: got "clear", expected clear or distress

### CV2-fired-after-12-years

_Long-service termination; could be civil or small claims depending on amount._

> I worked for a manufacturing company for 12 years as a production supervisor making $78,000 a year. Last month they called me in and fired me with two weeks' pay, saying it was a restructuring. I wasn't given any reason related to my performance. I want to know what I can do.

- [notice] `no-guided-intake` No guided intake exists for civil yet; only routing and the safety check ran.

- PASS court-path: routed to "small-claims", expected civil or small-claims
- PASS safety: got "clear", expected clear or distress

### FM1-separation-parenting

_Separated parent wanting a parenting schedule and child support._

> My partner and I separated in June after eight years together. We were never married. We have two kids, 6 and 9. They've been living with me and he sees them some weekends but it's whenever he feels like it. He hasn't paid anything toward the kids since he moved out. I want a proper schedule and child support.

- [notice] `no-guided-intake` No guided intake exists for family yet; only routing and the safety check ran.

- PASS court-path: routed to "family", expected family
- PASS safety: got "clear", expected clear or distress

### FM2-served-motion-to-change

_Payor served with a motion to change support after losing a job._

> My ex-wife has served me with a Motion to Change asking to increase the child support I pay. The problem is I lost my job in the spring and I'm making a lot less now. I actually need the support lowered, not raised. I have 30 days to respond and I don't have a lawyer.

- [notice] `no-guided-intake` No guided intake exists for family yet; only routing and the safety check ran.

- PASS court-path: routed to "family", expected family
- PASS safety: got "clear", expected clear or distress

### TR1-tenant-mould

_Residential tenant: belongs at the Landlord and Tenant Board, not a court._

> I rent an apartment in Toronto. There's been black mould in the bathroom and bedroom since last winter and my landlord keeps saying he'll send someone but never does. My son has asthma and it's getting worse. I want the landlord to fix it and I want some rent back.

- [notice] `no-guided-intake` No guided intake exists for tribunal yet; only routing and the safety check ran.

- PASS court-path: routed to "out-of-scope (ltb)", expected out-of-scope
- PASS safety: got "clear", expected clear or distress
