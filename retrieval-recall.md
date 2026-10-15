# Retrieval recall

Run 2026-10-15T17:08:29.409Z.

- **Stories with a labelled provision retrieved: 46 of 50** (small-claims: 32/35, civil: 7/7, family: 7/8)
- **Labelled provisions retrieved: 58 of 71**, of which 3 only through a followed cross-reference
- **Time** (median): writing queries 4774 ms, embedding 276 ms, whole retrieval 5224 ms; slowest 9718 ms

| story | court | result | found | missed | ms |
|---|---|---|---|---|---|
| defend-served-claim | small-claims | hit | oreg-258-98-small-claims-rules 9.01 |  | 6250 |
| they-never-answered | small-claims | hit | oreg-258-98-small-claims-rules 11.01, oreg-258-98-small-claims-rules 11.02 (ref) |  | 4963 |
| default-judgment-against-me | small-claims | hit | oreg-258-98-small-claims-rules 11.06 |  | 4367 |
| claim-not-served-yet | small-claims | **miss** |  | oreg-258-98-small-claims-rules 8.01 | 3907 |
| which-courthouse | small-claims | hit | oreg-258-98-small-claims-rules 6.01 |  | 3608 |
| conference-coming | small-claims | hit | oreg-258-98-small-claims-rules 13.02 | oreg-258-98-small-claims-rules 13.01 | 2956 |
| won-but-not-paid | small-claims | hit | oreg-258-98-small-claims-rules 20.08 |  | 4694 |
| too-much-for-small-claims | small-claims | hit | oreg-626-00-monetary-jurisdiction 1 |  | 7667 |
| appeal-small-claims | small-claims | hit | cja-courts-of-justice-act 31 |  | 6247 |
| cannot-afford-fees | small-claims | hit | ontario-fee-waiver |  | 2756 |
| old-loan | small-claims | hit | limitations-act-2002 4 | limitations-act-2002 5 | 5224 |
| found-out-late | small-claims | hit | limitations-act-2002 5 |  | 4470 |
| door-to-door | small-claims | hit | consumer-protection-act-2002 43 |  | 6590 |
| estimate-blown | small-claims | hit | consumer-protection-act-2002 10 |  | 4483 |
| mechanic-holding-car | small-claims | hit | consumer-protection-act-2002 56, repair-and-storage-liens-act 3 |  | 5989 |
| lied-to-at-sale | small-claims | hit | consumer-protection-act-2002 14, consumer-protection-act-2002 18 |  | 4893 |
| product-not-fit | small-claims | hit | sale-of-goods-act 15 |  | 5025 |
| collection-calls | small-claims | hit | cpo-guide-collection-agencies | cleo-debt-and-consumer-rights-collection-agency-called-me-do-i-have-talk-them | 7838 |
| credit-report-wrong | small-claims | hit | consumer-reporting-act 13 |  | 5450 |
| deposit-kept | small-claims | hit | residential-tenancies-act-2006 106 |  | 6702 |
| landlord-walks-in | small-claims | hit | residential-tenancies-act-2006 27 |  | 5742 |
| repairs-ignored | small-claims | hit | residential-tenancies-act-2006 20 |  | 5049 |
| own-use-eviction | small-claims | hit | residential-tenancies-act-2006 48 |  | 6264 |
| dog-bite | small-claims | hit | dog-owners-liability-act 2 |  | 4095 |
| store-slip | small-claims | hit | occupiers-liability-act 3 |  | 5306 |
| city-sidewalk | small-claims | hit | municipal-act-2001 44 |  | 4733 |
| toronto-sidewalk | small-claims | hit | city-of-toronto-act-2006 42 |  | 9718 |
| newspaper-lie | small-claims | hit | libel-and-slander-act 5 |  | 6122 |
| both-at-fault-fence | small-claims | hit | negligence-act 3 |  | 4685 |
| kid-vandalism | small-claims | hit | parental-responsibility-act-2000 2 |  | 5237 |
| neighbour-trespass | small-claims | hit | trespass-to-property-act 2 (ref) |  | 5323 |
| fired-no-notice | small-claims | **miss** |  | esa-2000-ontario 54, esa-2000-ontario 57 | 4179 |
| common-law-notice | civil | hit | decision-honda, decision-machtinger, decision-brake |  | 4527 |
| severance | civil | hit | esa-2000-ontario 64 |  | 6306 |
| vacation-pay | small-claims | hit | esa-2000-ontario 11 | esa-2000-ontario 38, esa-2000-ontario 35.2, esa-2000-ontario 36 | 4691 |
| overtime | small-claims | hit | esa-2000-ontario 22 |  | 4448 |
| fired-pregnant | civil | hit | human-rights-code 5, human-rights-code 10 |  | 6124 |
| move-away | family | hit | childrens-law-reform-act 39.3, divorce-act 16.9 (ref) |  | 5555 |
| afraid-of-ex | family | hit | family-law-act 46, childrens-law-reform-act 35 |  | 8027 |
| child-support-amount | family | hit | ontario-child-support-guidelines-full 3, federal-child-support-guidelines-full 3 |  | 3611 |
| common-law-support | family | **miss** |  | family-law-act 29, family-law-act 30 | 4220 |
| dividing-property | family | hit | family-law-act 5 |  | 4428 |
| parenting-decisions | family | hit | childrens-law-reform-act 24 |  | 4430 |
| divorce-grounds | family | hit | divorce-act 8 |  | 4405 |
| urgent-family-motion | family | hit | family-law-rules 14, childrens-law-reform-act 36 |  | 5562 |
| summary-judgment | civil | hit | rules-of-civil-procedure 20.01 | rules-of-civil-procedure 20.04 | 6010 |
| contractor-holdback | civil | hit | construction-act 22 |  | 5318 |
| money-paid-by-mistake | small-claims | **miss** |  | decision-garland | 7832 |
| insurer-bad-faith | civil | hit | decision-whiten, decision-fidler |  | 5824 |
| business-partner-lied | civil | hit | decision-bhasin, decision-callow |  | 5103 |

## Misses: what came back instead

### claim-not-served-yet

Missed: oreg-258-98-small-claims-rules 8.01

Queries:
- What is the time limit for service of a plaintiff’s claim after it is issued in the Ontario Small Claims Court?
- What methods of personal service or alternatives to personal service are permitted for a plaintiff’s claim on an individual in the Ontario Small Claims Court?
- When may the Ontario Small Claims Court order substituted service where personal service is impractical?
- How may a plaintiff obtain an extension of time for service of an issued plaintiff’s claim in the Ontario Small Claims Court?

Retrieved:
- oreg-258-98-small-claims-rules r. 8.04 [0.78]
- oreg-258-98-small-claims-rules r. 8.03 (8)-(10) [0.78]
- guide-serving-documents Alternative to personal servic [0.77]
- guide-serving-documents Personal service and alternati [0.76]
- guide-serving-documents Substituted Service [0.76]
- oreg-258-98-small-claims-rules r. 8.03 (4)-(7) [0.76]
- guide-serving-documents How long the plaintiff has to  [0.72]
- oreg-258-98-small-claims-rules r. 8.02 [0.72]
- cleo-tribunals-and-courts-how-do-i-fill-out-plaintiffs-claim-using-online-service the person or business you're  [0.69]
- ontario-suing-someone-small-claims When your trial date is less t [0.68]
- oreg-258-98-small-claims-rules r. 8.03 (1)-(3) (ref) [0.76]

### conference-coming

Missed: oreg-258-98-small-claims-rules 13.01

Queries:
- What is the purpose of a settlement conference in the Ontario Small Claims Court?
- Are parties required to attend a settlement conference in the Ontario Small Claims Court?
- What are the consequences of a party failing to attend a settlement conference in the Ontario Small Claims Court?

Retrieved:
- oreg-258-98-small-claims-rules r. 13.02 (6)-(7) [0.78]
- oreg-258-98-small-claims-rules r. 13.02 (1)-(5) [0.74]
- oreg-258-98-small-claims-rules r. 17.01 (1)-(2.1) [0.74]
- guide-getting-ready-for-court Who attends a settlement confe [0.73]
- oreg-258-98-small-claims-rules r. 13.03 (1)-(3) [0.73]
- guide-getting-ready-for-court Objecting to change of attenda [0.71]
- scj-steps-in-a-case Important information for befo [0.69]
- scj-steps-in-a-case Trial management conference [0.69]
- guide-getting-ready-for-court Example 3 [0.67]
- guide-getting-ready-for-court Preparing for a settlement con [0.67]
- oreg-258-98-small-claims-rules r. 17.01 (3)-(5) (ref) [0.74]

### old-loan

Missed: limitations-act-2002 5

Queries:
- What limitation period applies to commencing an action in the Ontario Small Claims Court to recover an unpaid loan?
- When is a claim for repayment of a loan with a fixed repayment date discovered under the Limitations Act, 2002?
- What effect does an acknowledgment of liability or part payment have on the limitation period for recovery of a debt?
- How is an action to recover an unpaid loan commenced by filing and serving a Plaintiff’s Claim in the Ontario Small Claims Court?

Retrieved:
- cleo-tribunals-and-courts-how-do-i-fill-out-plaintiffs-claim-using-online-service the person or business you're  [0.74]
- limitations-act-2002 s. 13 (1)-(3) [0.73]
- guide-making-a-claim Checklist: Making a claim [0.72]
- oreg-258-98-small-claims-rules r. 7.01 (1)-(2) [0.72]
- ontario-suing-someone-small-claims you are the plaintiff (the def [0.72]
- oreg-258-98-small-claims-rules r. 8.01 (6)-(8) [0.72]
- limitations-act-2002 s. 13 (8)-(11) [0.71]
- limitations-act-2002 s. 4 [0.70]
- limitations-act-2002 s. 15 (1)-(4) [0.66]
- oreg-258-98-small-claims-rules r. 11.1.01 (1)-(3) [0.65]
- consumer-reporting-act s. 23 (4) [0.61]
- construction-act s. 37 (1)-(2) [0.60]
- oreg-258-98-small-claims-rules r. 8.02 (ref) [0.72]
- oreg-258-98-small-claims-rules r. 8.03 (1)-(3) (ref) [0.72]
- limitations-act-2002 s. 13 (4)-(7) (ref) [0.71]
- oreg-258-98-small-claims-rules r. 11.03 (1)-(3) (ref) [0.65]
- oreg-258-98-small-claims-rules r. 9.03 (1)-(2) (ref) [0.65]
- construction-act s. 46 (1)-(3) (ref) [0.60]

### collection-calls

Missed: cleo-debt-and-consumer-rights-collection-agency-called-me-do-i-have-talk-them

Queries:
- What restrictions apply to a collection agency contacting a debtor at the debtor’s place of employment, and is the debtor required to communicate with the collection agency?
- When must a collection agency cease contacting a debtor who disputes the debt and requests that the matter be taken to court?
- What limitation period applies to an action to recover a debt under a cellular telephone service agreement?
- What constitutes an acknowledgment of liability or part payment that may restart the limitation period for a debt?
- How must a defendant in the Small Claims Court serve and file a Defence raising the expiry of a limitation period?

Retrieved:
- cpo-guide-collection-agencies When you can contact a debtor' [0.76]
- oreg-258-98-small-claims-rules r. 9.01 [0.74]
- guide-serving-documents A defence [0.73]
- guide-making-a-claim How long the defendant to a de [0.73]
- limitations-act-2002 s. 13 (8)-(11) [0.72]
- oreg-258-98-small-claims-rules r. 10.03 [0.72]
- guide-making-a-claim How long the defendant has to  [0.72]
- limitations-act-2002 s. 13 (1)-(3) [0.72]
- cpo-guide-collection-agencies If a debtor seeks legal action [0.71]
- cpo-guide-collection-agencies contact the debtor [0.69]
- cleo-debt-and-consumer-rights-what-rules-do-collection-agencies-have-follow-and-what-are-my only at certain times of the d [0.68]
- consumer-reporting-act s. 23 (4) [0.62]
- limitations-act-2002 s. 13 (4)-(7) (ref) [0.72]

### fired-no-notice

Missed: esa-2000-ontario 54, esa-2000-ontario 57

Queries:
- What statutory notice of termination or termination pay is required under the Employment Standards Act, 2000 when an employer terminates an employee’s employment without notice?
- In what circumstances is an employee entitled to severance pay under the Employment Standards Act, 2000?
- What reasonable notice or damages in lieu of notice may an employee claim at common law for wrongful dismissal without just cause?
- What monetary jurisdiction and commencement requirements apply to a wrongful dismissal action in the Ontario Small Claims Court?
- How does filing a complaint under the Employment Standards Act, 2000 affect an employee’s right to commence a civil proceeding for wrongful dismissal?

Retrieved:
- esa-2000-ontario s. 64 (1)-(2) [0.77]
- esa-2000-ontario s. 98 (1)-(2) [0.77]
- esa-2000-ontario s. 97 (1)-(4) [0.77]
- esa-guide-termination Termination pay [0.74]
- esa-2000-ontario s. 64 (3)-(4) [0.72]
- esa-guide-termination Less than 1 year	 1 week [0.70]
- esa-guide-termination Written notice of termination [0.69]
- canada-labour-code s. 247.991 (5) [0.67]
- cja-courts-of-justice-act s. 23 (1)-(2) [0.66]
- oreg-626-00-monetary-jurisdiction s. 2 (1)-(2) [0.65]
- oreg-626-00-monetary-jurisdiction s. 1 (1)-(2) [0.65]
- decision-honda para. 50 [0.64]
- canada-labour-code s. 247.99 (1)-(3) (ref) [0.67]
- cja-courts-of-justice-act s. 11 (1)-(2) (ref) [0.66]

### vacation-pay

Missed: esa-2000-ontario 38, esa-2000-ontario 35.2, esa-2000-ontario 36

Queries:
- Under Ontario’s Employment Standards Act, 2000, what entitlement does an employee have to accrued vacation pay upon resignation?
- What time limit does Ontario’s Employment Standards Act, 2000 impose for payment of outstanding wages, including vacation pay, after employment ends?
- Does the Ontario Small Claims Court have jurisdiction over a claim for unpaid vacation pay following resignation?
- What restrictions apply to pursuing unpaid vacation pay through a civil proceeding where an employment standards complaint has been filed?
- What limitation period and procedure apply to commencing an action in the Ontario Small Claims Court for unpaid vacation pay?

Retrieved:
- esa-2000-ontario s. 76 (1)-(2) [0.72]
- esa-2000-ontario s. 11 (5) [0.72]
- esa-guide-vacation When employment ends [0.69]
- esa-2000-ontario s. 97 (1)-(4) [0.68]
- esa-guide-vacation When employment ends [0.68]
- esa-2000-ontario s. 35 [0.67]
- termination-and-severance-of-employment s. 7 [0.63]
- decision-brake paras. 120-123 [0.62]
- oreg-258-98-small-claims-rules r. 11.1.01 (1)-(3) [0.60]
- oreg-258-98-small-claims-rules r. 11.03 (1)-(3) (ref) [0.60]
- oreg-258-98-small-claims-rules r. 9.03 (1)-(2) (ref) [0.60]

### common-law-support

Missed: family-law-act 29, family-law-act 30

Queries:
- What are the eligibility requirements for spousal support for unmarried persons who have cohabited under the Family Law Act?
- How is entitlement to spousal support determined where a spouse assumed child-care responsibilities during cohabitation?
- What factors govern the amount and duration of spousal support under the Family Law Act?
- How does an unmarried spouse commence an application for spousal support under the Family Law Rules, and how may temporary spousal support be sought pending determination of the application?

Retrieved:
- family-law-act s. 33 (9) [0.70]
- succession-law-reform-act s. 62 (1) [0.69]
- divorce-act s. 15.2 (4)-(6) [0.68]
- decision-bracklow para. 54 [0.68]
- decision-bracklow para. 53 [0.67]
- decision-bracklow paras. 14-16 [0.67]
- decision-bracklow para. 49 [0.67]
- family-law-act s. 33 (1)-(3) [0.66]
- interjurisdictional-support-orders-act-2002 s. 5 (1)-(3) [0.66]
- decision-kerr para. 208 [0.66]
- decision-kerr paras. 84-85 [0.65]
- family-law-rules r. 8 (1)-(1.2) [0.63]
- divorce-act s. 15.2 (1)-(3) (ref) [0.68]
- family-law-rules r. 32.1 (1)-(2) (ref) [0.63]
- family-law-rules r. 14 (21)-(24) (ref) [0.63]

### summary-judgment

Missed: rules-of-civil-procedure 20.04

Queries:
- In an existing action in the Superior Court of Justice, when may a plaintiff move for summary judgment on the basis that there is no genuine issue requiring a trial?
- What procedural requirements and evidentiary obligations apply to a plaintiff’s motion for summary judgment under Rule 20 of the Rules of Civil Procedure?
- When may the court strike out a statement of defence as disclosing no reasonable defence under Rule 21 or as frivolous, vexatious or an abuse of process under Rule 25.11?

Retrieved:
- rules-of-civil-procedure r. 20.01 (1)-(3) [0.79]
- rules-of-civil-procedure r. 20.02 (1)-(2) [0.76]
- decision-hryniak para. 42 [0.76]
- rules-of-civil-procedure r. 20.03 (1)-(4) [0.76]
- rules-of-civil-procedure r. 20.05 (7) [0.73]
- decision-hryniak paras. 46-47 [0.70]
- rules-of-civil-procedure r. 39.01 (1)-(4) (ref) [0.76]
- rules-of-civil-procedure r. 4.06.1 (1)-(2.2) (ref) [0.76]
- rules-of-civil-procedure r. 20.05 (2)-(6) (ref) [0.73]

### money-paid-by-mistake

Missed: decision-garland

Queries:
- What cause of action for restitution based on unjust enrichment is available in the Ontario Small Claims Court for money transferred to a recipient by mistake?
- What rules govern the commencement of an action by Plaintiff’s Claim in the Ontario Small Claims Court to recover money paid by mistake?
- What information identifying the defendant is required to issue and serve a Plaintiff’s Claim in the Ontario Small Claims Court?
- What evidence is required in the Ontario Small Claims Court to establish a mistaken payment and the recipient’s obligation to make restitution?

Retrieved:
- cleo-tribunals-and-courts-how-do-i-fill-out-plaintiffs-claim-using-online-service the person or business you're  [0.75]
- ontario-suing-someone-small-claims you are the plaintiff (the def [0.73]
- oreg-258-98-small-claims-rules r. 8.01 (1)-(5.1) [0.73]
- guide-serving-documents Serving a claim [0.72]
- oreg-258-98-small-claims-rules r. 7.01 (1)-(2) [0.71]
- oreg-258-98-small-claims-rules r. 9.03 (5)-(7) [0.69]
- oreg-258-98-small-claims-rules r. 11.1.01 (1)-(3) [0.68]
- ontario-suing-someone-small-claims If you think you can’t afford  [0.68]
- guide-making-a-claim If you do not agree with the d [0.61]
- cleo-tribunals-and-courts-how-do-i-stop-claim-i-filed-using-small-claims-online-service Legal help [0.61]
- decision-kerr paras. 75-76 [0.60]
- decision-kerr para. 78 [0.59]
- oreg-258-98-small-claims-rules r. 8.02 (ref) [0.73]
- oreg-258-98-small-claims-rules r. 8.03 (1)-(3) (ref) [0.73]
- oreg-258-98-small-claims-rules r. 11.03 (1)-(3) (ref) [0.68]
- oreg-258-98-small-claims-rules r. 9.03 (1)-(2) (ref) [0.68]
