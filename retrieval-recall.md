# Retrieval recall

Run 2026-10-06T04:04:53.738Z.

- **Stories with a labelled provision retrieved: 48 of 50** (small-claims: 34/35, civil: 6/7, family: 8/8)
- **Labelled provisions retrieved: 57 of 71**, of which 3 only through a followed cross-reference
- **Time** (median): writing queries 4900 ms, embedding 220 ms, whole retrieval 5236 ms; slowest 8728 ms

| story | court | result | found | missed | ms |
|---|---|---|---|---|---|
| defend-served-claim | small-claims | hit | oreg-258-98-small-claims-rules 9.01 |  | 6887 |
| they-never-answered | small-claims | hit | oreg-258-98-small-claims-rules 11.02 (ref) | oreg-258-98-small-claims-rules 11.01 | 5461 |
| default-judgment-against-me | small-claims | hit | oreg-258-98-small-claims-rules 11.06 |  | 5013 |
| claim-not-served-yet | small-claims | hit | oreg-258-98-small-claims-rules 8.01 |  | 3696 |
| which-courthouse | small-claims | hit | oreg-258-98-small-claims-rules 6.01 |  | 4467 |
| conference-coming | small-claims | hit | oreg-258-98-small-claims-rules 13.01, oreg-258-98-small-claims-rules 13.02 |  | 2984 |
| won-but-not-paid | small-claims | hit | oreg-258-98-small-claims-rules 20.08 |  | 5266 |
| too-much-for-small-claims | small-claims | hit | oreg-626-00-monetary-jurisdiction 1 |  | 4551 |
| appeal-small-claims | small-claims | hit | cja-courts-of-justice-act 31 |  | 4161 |
| cannot-afford-fees | small-claims | hit | ontario-fee-waiver |  | 4176 |
| old-loan | small-claims | hit | limitations-act-2002 4 | limitations-act-2002 5 | 3858 |
| found-out-late | small-claims | hit | limitations-act-2002 5 |  | 4405 |
| door-to-door | small-claims | hit | consumer-protection-act-2002 43 |  | 5370 |
| estimate-blown | small-claims | hit | consumer-protection-act-2002 10 |  | 4774 |
| mechanic-holding-car | small-claims | hit | consumer-protection-act-2002 56, repair-and-storage-liens-act 3 |  | 7212 |
| lied-to-at-sale | small-claims | hit | consumer-protection-act-2002 14 | consumer-protection-act-2002 18 | 7801 |
| product-not-fit | small-claims | hit | sale-of-goods-act 15 |  | 6275 |
| collection-calls | small-claims | hit | cpo-guide-collection-agencies | cleo-debt-and-consumer-rights-collection-agency-called-me-do-i-have-talk-them | 5188 |
| credit-report-wrong | small-claims | hit | consumer-reporting-act 13 |  | 6411 |
| deposit-kept | small-claims | hit | residential-tenancies-act-2006 106 |  | 5273 |
| landlord-walks-in | small-claims | hit | residential-tenancies-act-2006 27 |  | 4600 |
| repairs-ignored | small-claims | hit | residential-tenancies-act-2006 20 |  | 6372 |
| own-use-eviction | small-claims | hit | residential-tenancies-act-2006 48 |  | 5892 |
| dog-bite | small-claims | hit | dog-owners-liability-act 2 |  | 5356 |
| store-slip | small-claims | hit | occupiers-liability-act 3 |  | 5154 |
| city-sidewalk | small-claims | hit | municipal-act-2001 44 |  | 5236 |
| toronto-sidewalk | small-claims | hit | city-of-toronto-act-2006 42 |  | 7877 |
| newspaper-lie | small-claims | hit | libel-and-slander-act 5 |  | 4146 |
| both-at-fault-fence | small-claims | hit | negligence-act 3 |  | 4584 |
| kid-vandalism | small-claims | hit | parental-responsibility-act-2000 2 |  | 4626 |
| neighbour-trespass | small-claims | hit | trespass-to-property-act 2 |  | 4963 |
| fired-no-notice | small-claims | hit | esa-2000-ontario 57 (ref) | esa-2000-ontario 54 | 6802 |
| common-law-notice | civil | hit | decision-honda, decision-brake | decision-machtinger | 6255 |
| severance | civil | hit | esa-2000-ontario 64 |  | 5403 |
| vacation-pay | small-claims | hit | esa-2000-ontario 11, esa-2000-ontario 35.2 | esa-2000-ontario 38, esa-2000-ontario 36 | 4107 |
| overtime | small-claims | hit | esa-2000-ontario 22 |  | 4259 |
| fired-pregnant | civil | **miss** |  | human-rights-code 5, human-rights-code 10 | 5318 |
| move-away | family | hit | childrens-law-reform-act 39.3, divorce-act 16.9 (ref) |  | 5124 |
| afraid-of-ex | family | hit | family-law-act 46, childrens-law-reform-act 35 |  | 8728 |
| child-support-amount | family | hit | ontario-child-support-guidelines-full 3, federal-child-support-guidelines-full 3 |  | 4687 |
| common-law-support | family | hit | family-law-act 29 | family-law-act 30 | 4531 |
| dividing-property | family | hit | family-law-act 5 |  | 4125 |
| parenting-decisions | family | hit | childrens-law-reform-act 24 |  | 4010 |
| divorce-grounds | family | hit | divorce-act 8 |  | 5336 |
| urgent-family-motion | family | hit | childrens-law-reform-act 36 | family-law-rules 14 | 8258 |
| summary-judgment | civil | hit | rules-of-civil-procedure 20.01 | rules-of-civil-procedure 20.04 | 6570 |
| contractor-holdback | civil | hit | construction-act 22 |  | 6663 |
| money-paid-by-mistake | small-claims | **miss** |  | decision-garland | 4126 |
| insurer-bad-faith | civil | hit | decision-whiten, decision-fidler |  | 6018 |
| business-partner-lied | civil | hit | decision-bhasin, decision-callow |  | 8455 |

## Misses: what came back instead

### they-never-answered

Missed: oreg-258-98-small-claims-rules 11.01

Queries:
- What is the time limit for a defendant to serve and file a defence after service of a plaintiff’s claim in the Ontario Small Claims Court?
- What requirements apply to personal service of a plaintiff’s claim on an individual defendant and filing proof of service in the Ontario Small Claims Court?
- How may a plaintiff request that a defendant who has failed to file a defence be noted in default in an existing Ontario Small Claims Court proceeding?
- When may a plaintiff obtain default judgment for a debt or liquidated demand, and when must the plaintiff request an assessment of damages in the Ontario Small Claims Court?

Retrieved:
- guide-making-a-claim If the defendant to the defend [0.81]
- ontario-suing-someone-small-claims If no Defence is filed within  [0.80]
- oreg-258-98-small-claims-rules r. 11.03 (4)-(7) [0.80]
- ontario-suing-someone-small-claims If no Defence is filed within  [0.79]
- oreg-258-98-small-claims-rules r. 8.01 (1)-(5.1) [0.78]
- oreg-258-98-small-claims-rules r. 11.03 (1)-(3) [0.78]
- scj-steps-in-a-case Default Proceedings [0.78]
- guide-serving-documents Personal service (requirements [0.78]
- guide-serving-documents Personal service only (require [0.77]
- oreg-258-98-small-claims-rules r. 9.01 [0.72]
- oreg-258-98-small-claims-rules r. 8.02 (ref) [0.78]
- oreg-258-98-small-claims-rules r. 8.03 (1)-(3) (ref) [0.78]
- oreg-258-98-small-claims-rules r. 11.02 (1)-(3) (ref) [0.78]

### old-loan

Missed: limitations-act-2002 5

Queries:
- What limitation period applies to commencing an action in the Ontario Small Claims Court for repayment of a loan?
- When is a claim for repayment of a loan with a fixed repayment date discovered under the Limitations Act, 2002?
- Does an acknowledgment of liability or part payment affect the limitation period for a claim to recover a debt?
- How is an action for recovery of a debt commenced by filing and serving a Plaintiff’s Claim in the Ontario Small Claims Court?

Retrieved:
- oreg-258-98-small-claims-rules r. 7.01 (1)-(2) [0.76]
- guide-making-a-claim Checklist: Making a claim [0.75]
- oreg-258-98-small-claims-rules r. 8.01 (1)-(5.1) [0.75]
- oreg-258-98-small-claims-rules r. 8.01 (6)-(8) [0.73]
- limitations-act-2002 s. 13 (8)-(11) [0.71]
- limitations-act-2002 s. 13 (1)-(3) [0.70]
- limitations-act-2002 s. 4 [0.70]
- limitations-act-2002 s. 15 (1)-(4) [0.66]
- oreg-258-98-small-claims-rules r. 11.1.01 (1)-(3) [0.65]
- consumer-reporting-act s. 23 (4) [0.62]
- provincial-offences-act s. 76 (1)-(2) [0.61]
- oreg-258-98-small-claims-rules r. 8.02 (ref) [0.75]
- oreg-258-98-small-claims-rules r. 8.03 (1)-(3) (ref) [0.75]
- limitations-act-2002 s. 13 (4)-(7) (ref) [0.71]
- oreg-258-98-small-claims-rules r. 11.03 (1)-(3) (ref) [0.65]
- oreg-258-98-small-claims-rules r. 9.03 (1)-(2) (ref) [0.65]

### lied-to-at-sale

Missed: consumer-protection-act-2002 18

Queries:
- Does a false representation concerning the condition of used goods constitute an unfair practice under Ontario consumer protection legislation?
- What implied conditions or warranties under the Sale of Goods Act apply where goods do not correspond with the seller’s description?
- What remedies, including rescission, restitution or damages, are available for misrepresentation or breach of contract where a seller refuses a refund?
- What requirements under the Rules of the Small Claims Court apply to commencing an action arising from the sale of goods?
- What evidence is required in the Small Claims Court to establish an oral representation about goods and their failure to conform to that representation?

Retrieved:
- sale-of-goods-act s. 14 [0.75]
- sale-of-goods-act s. 16 (1)-(2) [0.71]
- sale-of-goods-act s. 53 [0.70]
- consumer-protection-act-2002 s. 15 (1)-(2) [0.69]
- oreg-258-98-small-claims-rules r. 7.01 (1)-(2) [0.67]
- cpo-protecting-consumer-rights Unfair practices [0.66]
- oreg-258-98-small-claims-rules r. 20.06 (1)-(1.2) [0.65]
- consumer-protection-act-2002 s. 14 (1)-(2) [0.64]
- oreg-258-98-small-claims-rules r. 6.01 (1)-(3) [0.64]
- cpo-protecting-consumer-rights a store sells electronics adve [0.64]
- guide-getting-ready-for-court Evidence you can present at tr [0.61]
- sale-of-goods-act s. 48 (1)-(3) [0.59]

### collection-calls

Missed: cleo-debt-and-consumer-rights-collection-agency-called-me-do-i-have-talk-them

Queries:
- What restrictions apply to a collection agency contacting a debtor at the debtor’s place of employment under Ontario’s Collection and Debt Settlement Services Act and its regulation?
- Is a debtor required to communicate with a collection agency, and what notice may the debtor give to require communication in writing or through a legal representative?
- What limitation period applies to an action to recover an unpaid telecommunications account, and how do acknowledgment of the debt or partial payment affect that limitation period?
- How does a defendant in the Ontario Small Claims Court raise a limitation-period defence in a Defence, and what rules govern filing and serving the Defence?

Retrieved:
- cpo-guide-collection-agencies When you can contact a debtor' [0.79]
- guide-serving-documents A defence [0.77]
- oreg-258-98-small-claims-rules r. 9.01 [0.76]
- cpo-guide-collection-agencies If a debtor seeks legal action [0.76]
- oreg-258-98-small-claims-rules r. 10.03 [0.75]
- guide-making-a-claim How long the defendant to a de [0.73]
- guide-making-a-claim How long the defendant has to  [0.73]
- cpo-guide-collection-agencies contact the debtor [0.72]
- cpo-guide-collection-agencies Prohibited practices and condu [0.70]
- limitations-act-2002 s. 13 (8)-(11) [0.64]
- limitations-act-2002 s. 13 (1)-(3) (ref) [0.64]
- limitations-act-2002 s. 13 (4)-(7) (ref) [0.64]

### fired-no-notice

Missed: esa-2000-ontario 54

Queries:
- What statutory notice of termination or termination pay is required under the Employment Standards Act, 2000 when an employee is dismissed without notice, and what exemptions apply?
- What are the eligibility requirements for statutory severance pay under the Employment Standards Act, 2000?
- What entitlement to reasonable notice or damages in lieu of notice arises at common law upon dismissal without cause, and how may an enforceable employment agreement limit that entitlement?
- Does the Ontario Small Claims Court have jurisdiction over a wrongful dismissal claim, and what limitation period and rules govern commencement of the action by Plaintiff’s Claim?
- How does filing a complaint under the Employment Standards Act, 2000 affect an employee’s right to commence a civil proceeding for wrongful dismissal or unpaid termination or severance pay?

Retrieved:
- esa-2000-ontario s. 98 (1)-(2) [0.77]
- esa-2000-ontario s. 97 (1)-(4) [0.77]
- esa-guide-termination Termination pay [0.75]
- esa-guide-termination Written notice of termination [0.75]
- esa-2000-ontario s. 61 (1)-(1.1) [0.74]
- esa-2000-ontario s. 64 (1)-(2) [0.74]
- esa-guide-termination See also: Employment Standards [0.73]
- decision-honda para. 50 [0.68]
- decision-matthews para. 43 [0.67]
- decision-matthews paras. 76-77 [0.66]
- oreg-258-98-small-claims-rules r. 11.1.01 (1)-(3) [0.66]
- decision-potter para. 77 [0.66]
- esa-2000-ontario s. 57 (ref) [0.74]
- esa-2000-ontario s. 58 (1)-(3) (ref) [0.74]
- oreg-258-98-small-claims-rules r. 11.03 (1)-(3) (ref) [0.66]
- oreg-258-98-small-claims-rules r. 9.03 (1)-(2) (ref) [0.66]

### common-law-notice

Missed: decision-machtinger

Queries:
- In an action for wrongful dismissal before the Ontario Superior Court of Justice, what is the distinction between minimum statutory termination entitlements under the Employment Standards Act, 2000 and common law reasonable notice or damages in lieu of notice?
- How is entitlement to statutory termination pay and severance pay determined under the Employment Standards Act, 2000 where employment is terminated as a result of restructuring?
- What factors govern the assessment of common law reasonable notice, including length of service, age, character of employment and availability of similar employment?
- What duty to mitigate damages applies to a wrongful dismissal claim, and how does the availability of comparable employment affect the assessment of mitigation?

Retrieved:
- decision-brake paras. 157-158 [0.78]
- decision-red-deer  [0.74]
- decision-red-deer  [0.74]
- decision-red-deer  [0.74]
- esa-2000-ontario s. 64 (1)-(2) [0.74]
- esa-guide-termination See also: Employment Standards [0.72]
- esa-2000-ontario s. 63 (2.3)-(3) [0.72]
- decision-brake paras. 159-160 [0.72]
- esa-2000-ontario s. 65 (1)-(2.1) [0.72]
- decision-potter para. 77 [0.71]
- esa-2000-ontario s. 65 (3)-(5) [0.71]
- decision-honda para. 25 [0.71]
- esa-2000-ontario s. 66.1 (5)-(9) (ref) [0.72]
- esa-2000-ontario s. 57 (ref) [0.71]
- esa-2000-ontario s. 58 (1)-(3) (ref) [0.71]

### vacation-pay

Missed: esa-2000-ontario 38, esa-2000-ontario 36

Queries:
- Under Ontario’s Employment Standards Act, 2000, what vacation pay is payable when an employee resigns?
- Under Ontario’s Employment Standards Act, 2000, what is the deadline for paying outstanding wages, including accrued vacation pay, after an employee’s employment ends?
- Does the Ontario Small Claims Court have jurisdiction over a claim for unpaid vacation pay following an employee’s resignation?
- What restrictions apply to pursuing unpaid vacation pay through both an employment standards complaint and a civil proceeding?
- What limitation period and procedural requirements apply to commencing an Ontario Small Claims Court action for unpaid vacation pay?

Retrieved:
- esa-2000-ontario s. 11 (5) [0.77]
- esa-2000-ontario s. 35.2 [0.70]
- esa-guide-vacation When employment ends [0.69]
- esa-guide-termination $180.00 4 weeks = $720.00 [0.68]
- esa-2000-ontario s. 97 (1)-(4) [0.67]
- esa-guide-termination $20.00 an hour X 40 hours a we [0.66]
- decision-brake paras. 120-123 [0.64]
- termination-and-severance-of-employment s. 7 [0.63]
- esa-2000-ontario s. 35 [0.63]
- oreg-258-98-small-claims-rules r. 11.1.01 (1)-(3) [0.62]
- esa-2000-ontario s. 33 (1)-(3) (ref) [0.70]
- esa-2000-ontario s. 34 (1)-(2) (ref) [0.70]
- oreg-258-98-small-claims-rules r. 11.03 (1)-(3) (ref) [0.62]
- oreg-258-98-small-claims-rules r. 9.03 (1)-(2) (ref) [0.62]

### fired-pregnant

Missed: human-rights-code 5, human-rights-code 10

Queries:
- In a civil proceeding before the Ontario Superior Court of Justice, when does termination of employment constitute discrimination because of sex, including pregnancy, under the Ontario Human Rights Code?
- In a civil proceeding before the Ontario Superior Court of Justice, what evidence and legal principles apply to determining whether the elimination of a position constitutes discrimination because of pregnancy?
- Under the Ontario Human Rights Code, when may the Ontario Superior Court of Justice award a remedy for infringement of the right to equal treatment in employment in conjunction with another cause of action?
- What statutory termination entitlements and common law wrongful dismissal remedies may apply when an employee’s position is eliminated following disclosure of pregnancy?

Retrieved:
- decision-jaffer para. 44 [0.68]
- decision-jaffer para. 43 [0.67]
- human-rights-code s. 46.1 (1)-(2) [0.66]
- decision-brake paras. 4-9 [0.64]
- decision-jaffer paras. 37-38 [0.64]
- decision-jaffer para. 42 [0.64]
- decision-brake paras. 120-123 [0.64]
- decision-potter para. 91 [0.64]
- decision-potter para. 91 [0.63]
- decision-potter para. 84 [0.63]
- esa-2000-ontario s. 56 (3.7)-(3.8) [0.63]
- esa-guide-termination the employee receives suppleme [0.57]

### common-law-support

Missed: family-law-act 30

Queries:
- What is the definition of “spouse” for entitlement to spousal support by unmarried cohabitants under Ontario’s Family Law Act?
- What statutory factors govern entitlement to spousal support, including a spouse’s contributions to child care and the economic consequences of the relationship and its breakdown?
- How are the amount and duration of spousal support determined for unmarried spouses in Ontario?
- How does an unmarried spouse commence an application for spousal support in Ontario family court under the Family Law Rules?
- When may an applicant seek a temporary order for spousal support pending final determination of a family court application?

Retrieved:
- decision-bracklow para. 40 [0.74]
- decision-bracklow para. 39 [0.74]
- family-law-act s. 29 [0.74]
- decision-bracklow para. 49 [0.72]
- decision-bracklow para. 8 [0.71]
- decision-moge II. Judgments [0.71]
- family-law-act s. 33 (1)-(3) [0.67]
- family-law-act s. 44 (1)-(2) [0.67]
- family-law-act s. 33 (9)-(10) [0.67]
- family-law-rules r. 8 (1)-(1.2) [0.66]
- succession-law-reform-act s. 64 [0.66]
- succession-law-reform-act s. 60 (1)-(2) [0.66]
- family-law-act s. 37 (1)-(2) (ref) [0.67]
- family-law-rules r. 32.1 (1)-(2) (ref) [0.66]
- family-law-rules r. 14 (21)-(24) (ref) [0.66]
- succession-law-reform-act s. 62 (1) (ref) [0.66]
- succession-law-reform-act s. 63 (1)-(2) (ref) [0.66]
- succession-law-reform-act s. 58 (1)-(3) (ref) [0.66]

### urgent-family-motion

Missed: family-law-rules 14

Queries:
- What is the procedure under the Family Law Rules for bringing an urgent motion for the return of children before a case conference?
- In what circumstances may an urgent motion concerning parenting arrangements be brought without notice to the other party?
- What interim parenting order or enforcement order may the court make where a parent withholds children following parenting time?
- In what circumstances may the court direct a police force to locate, apprehend and deliver children under the Children’s Law Reform Act?

Retrieved:
- childrens-law-reform-act s. 36 (2)-(6) [0.76]
- childrens-law-reform-act s. 36 (1)-(2) [0.74]
- child-youth-and-family-services-act-2017 s. 83 (3)-(4) [0.68]
- childrens-law-reform-act s. 46 (8) [0.66]
- family-law-rules r. 37.2 (5)-(8) [0.66]
- family-law-rules r. 8 (10)-(13) [0.65]
- family-law-rules r. 17 (4)-(5) [0.64]
- family-law-rules r. 17 (12)-(13) [0.64]
- child-youth-and-family-services-act-2017 s. 102 (3)-(6) [0.63]
- childrens-law-reform-act s. 39.1 (4)-(5) [0.60]
- child-youth-and-family-services-act-2017 s. 83 (1)-(2) (ref) [0.68]
- family-law-rules r. 15 (1)-(3) (ref) [0.64]
- family-law-rules r. 32.1 (1)-(2) (ref) [0.64]
- family-law-rules r. 17 (13)-(14) (ref) [0.64]
- child-youth-and-family-services-act-2017 s. 104 (1)-(4) (ref) [0.63]
- child-youth-and-family-services-act-2017 s. 121 (1)-(2.1) (ref) [0.63]

### summary-judgment

Missed: rules-of-civil-procedure 20.04

Queries:
- In an existing civil proceeding in the Ontario Superior Court of Justice, when may a plaintiff move for summary judgment on the ground that there is no genuine issue requiring a trial?
- What evidence and procedure are required on a motion for summary judgment under Rule 20 of the Rules of Civil Procedure?
- When may a statement of defence be struck out on the ground that it discloses no reasonable defence, or is frivolous, vexatious or an abuse of the process of the court, under Rule 25.11?
- When may judgment be obtained on admissions of fact in a pleading or otherwise under Rule 51.06?

Retrieved:
- rules-of-civil-procedure r. 20.02 (1)-(2) [0.77]
- rules-of-civil-procedure r. 20.01 (1)-(3) [0.75]
- decision-hryniak para. 42 [0.73]
- rules-of-civil-procedure r. 25.11 [0.72]
- rules-of-civil-procedure r. 51.06 (1)-(2) [0.71]
- decision-hryniak paras. 46-47 [0.69]
- decision-jaffer para. 17 [0.68]
- rules-of-civil-procedure r. 39.01 (1)-(4) (ref) [0.77]

### money-paid-by-mistake

Missed: decision-garland

Queries:
- What cause of action permits recovery in the Ontario Small Claims Court of money paid to an unintended recipient by mistake, including restitution for unjust enrichment?
- Does the Ontario Small Claims Court have jurisdiction over a claim for repayment of money transferred by mistake?
- What limitation period applies to commencing an action for recovery of money paid by mistake?
- What requirements govern commencing an action by Plaintiff’s Claim and serving the defendant in the Ontario Small Claims Court?

Retrieved:
- oreg-258-98-small-claims-rules r. 8.01 (1)-(5.1) [0.78]
- oreg-258-98-small-claims-rules r. 7.01 (1)-(2) [0.78]
- oreg-258-98-small-claims-rules r. 8.01 (6)-(8) [0.75]
- guide-serving-documents Serving a claim [0.75]
- guide-making-a-claim Checklist: Making a claim [0.73]
- decision-kerr para. 78 [0.63]
- decision-kerr paras. 47-48 [0.62]
- oreg-258-98-small-claims-rules r. 19.05 [0.62]
- decision-kerr para. 55 [0.62]
- decision-kerr paras. 75-76 [0.61]
- guide-after-judgment Enforcing an order from anothe [0.61]
- limitations-act-2002 s. 15 (4)-(6) [0.61]
- oreg-258-98-small-claims-rules r. 8.02 (ref) [0.78]
- oreg-258-98-small-claims-rules r. 8.03 (1)-(3) (ref) [0.78]
