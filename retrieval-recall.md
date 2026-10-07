# Retrieval recall

Run 2026-10-07T03:27:58.335Z.

- **Stories with a labelled provision retrieved: 46 of 50** (small-claims: 31/35, civil: 7/7, family: 8/8)
- **Labelled provisions retrieved: 56 of 71**, of which 2 only through a followed cross-reference
- **Time** (median): writing queries 4450 ms, embedding 201 ms, whole retrieval 4754 ms; slowest 8976 ms

| story | court | result | found | missed | ms |
|---|---|---|---|---|---|
| defend-served-claim | small-claims | hit | oreg-258-98-small-claims-rules 9.01 |  | 3969 |
| they-never-answered | small-claims | **miss** |  | oreg-258-98-small-claims-rules 11.01, oreg-258-98-small-claims-rules 11.02 | 4962 |
| default-judgment-against-me | small-claims | hit | oreg-258-98-small-claims-rules 11.06 |  | 4087 |
| claim-not-served-yet | small-claims | hit | oreg-258-98-small-claims-rules 8.01 |  | 3959 |
| which-courthouse | small-claims | hit | oreg-258-98-small-claims-rules 6.01 |  | 4185 |
| conference-coming | small-claims | hit | oreg-258-98-small-claims-rules 13.02 | oreg-258-98-small-claims-rules 13.01 | 2488 |
| won-but-not-paid | small-claims | hit | oreg-258-98-small-claims-rules 20.08 |  | 4500 |
| too-much-for-small-claims | small-claims | hit | oreg-626-00-monetary-jurisdiction 1 |  | 7550 |
| appeal-small-claims | small-claims | hit | cja-courts-of-justice-act 31 |  | 4874 |
| cannot-afford-fees | small-claims | hit | ontario-fee-waiver |  | 3637 |
| old-loan | small-claims | hit | limitations-act-2002 4 | limitations-act-2002 5 | 4107 |
| found-out-late | small-claims | hit | limitations-act-2002 5 |  | 5340 |
| door-to-door | small-claims | hit | consumer-protection-act-2002 43 |  | 5004 |
| estimate-blown | small-claims | hit | consumer-protection-act-2002 10 |  | 4370 |
| mechanic-holding-car | small-claims | hit | consumer-protection-act-2002 56, repair-and-storage-liens-act 3 |  | 6721 |
| lied-to-at-sale | small-claims | hit | consumer-protection-act-2002 14, consumer-protection-act-2002 18 |  | 4691 |
| product-not-fit | small-claims | hit | sale-of-goods-act 15 |  | 5187 |
| collection-calls | small-claims | hit | cpo-guide-collection-agencies | cleo-debt-and-consumer-rights-collection-agency-called-me-do-i-have-talk-them | 7258 |
| credit-report-wrong | small-claims | hit | consumer-reporting-act 13 |  | 4986 |
| deposit-kept | small-claims | hit | residential-tenancies-act-2006 106 |  | 6372 |
| landlord-walks-in | small-claims | hit | residential-tenancies-act-2006 27 |  | 6149 |
| repairs-ignored | small-claims | hit | residential-tenancies-act-2006 20 |  | 4658 |
| own-use-eviction | small-claims | hit | residential-tenancies-act-2006 48 |  | 6054 |
| dog-bite | small-claims | hit | dog-owners-liability-act 2 |  | 4614 |
| store-slip | small-claims | **miss** |  | occupiers-liability-act 3 | 4904 |
| city-sidewalk | small-claims | hit | municipal-act-2001 44 |  | 8976 |
| toronto-sidewalk | small-claims | hit | city-of-toronto-act-2006 42 |  | 5040 |
| newspaper-lie | small-claims | hit | libel-and-slander-act 5 |  | 7922 |
| both-at-fault-fence | small-claims | hit | negligence-act 3 |  | 4754 |
| kid-vandalism | small-claims | hit | parental-responsibility-act-2000 2 |  | 4995 |
| neighbour-trespass | small-claims | hit | trespass-to-property-act 2 (ref) |  | 3632 |
| fired-no-notice | small-claims | hit | esa-2000-ontario 57 (ref) | esa-2000-ontario 54 | 5919 |
| common-law-notice | civil | hit | decision-honda, decision-brake | decision-machtinger | 4264 |
| severance | civil | hit | esa-2000-ontario 64 |  | 6395 |
| vacation-pay | small-claims | **miss** |  | esa-2000-ontario 38, esa-2000-ontario 11, esa-2000-ontario 35.2, esa-2000-ontario 36 | 4069 |
| overtime | small-claims | hit | esa-2000-ontario 22 |  | 4680 |
| fired-pregnant | civil | hit | human-rights-code 10 | human-rights-code 5 | 4516 |
| move-away | family | hit | childrens-law-reform-act 39.3, divorce-act 16.9 |  | 5527 |
| afraid-of-ex | family | hit | family-law-act 46, childrens-law-reform-act 35 |  | 7229 |
| child-support-amount | family | hit | ontario-child-support-guidelines-full 3, federal-child-support-guidelines-full 3 |  | 4100 |
| common-law-support | family | hit | family-law-act 29 | family-law-act 30 | 3857 |
| dividing-property | family | hit | family-law-act 5 |  | 3903 |
| parenting-decisions | family | hit | childrens-law-reform-act 24 |  | 3183 |
| divorce-grounds | family | hit | divorce-act 8 |  | 3718 |
| urgent-family-motion | family | hit | family-law-rules 14, childrens-law-reform-act 36 |  | 4915 |
| summary-judgment | civil | hit | rules-of-civil-procedure 20.04, rules-of-civil-procedure 20.01 |  | 4354 |
| contractor-holdback | civil | hit | construction-act 22 |  | 4561 |
| money-paid-by-mistake | small-claims | **miss** |  | decision-garland | 3675 |
| insurer-bad-faith | civil | hit | decision-whiten, decision-fidler |  | 6002 |
| business-partner-lied | civil | hit | decision-bhasin, decision-callow |  | 5661 |

## Misses: what came back instead

### they-never-answered

Missed: oreg-258-98-small-claims-rules 11.01, oreg-258-98-small-claims-rules 11.02

Queries:
- Under the Ontario Small Claims Court Rules, what is the time for a defendant to serve and file a defence after service of a plaintiff’s claim?
- What constitutes valid service of a plaintiff’s claim on an individual defendant at the defendant’s place of residence, and how must service be proved?
- In an existing Small Claims Court proceeding, how may a plaintiff have a defendant noted in default for failing to file a defence?
- When may a plaintiff obtain default judgment for a debt or liquidated demand after a defendant has been noted in default?
- What procedure applies to obtaining default judgment where the plaintiff’s claim is for unliquidated damages, including a motion or an assessment hearing?

Retrieved:
- guide-getting-ready-for-court Assessment hearing [0.81]
- oreg-258-98-small-claims-rules r. 11.03 (4)-(7) [0.80]
- ontario-suing-someone-small-claims If no Defence is filed within  [0.80]
- guide-making-a-claim If the defendant to the defend [0.78]
- scj-steps-in-a-case Default Proceedings [0.78]
- oreg-258-98-small-claims-rules r. 9.01 [0.77]
- guide-making-a-claim How long the defendant to a de [0.77]
- scj-default-proceedings Default judgment [0.77]
- ontario-suing-someone-small-claims If no Defence is filed within  [0.76]
- scj-default-proceedings Default proceedings [0.76]
- guide-serving-documents Example 2 [0.72]
- oreg-258-98-small-claims-rules r. 8.01 (1)-(5.1) (ref) [0.80]

### conference-coming

Missed: oreg-258-98-small-claims-rules 13.01

Queries:
- What is the purpose of a settlement conference in the Ontario Small Claims Court?
- Who is required to attend a settlement conference in the Ontario Small Claims Court?
- What are the consequences of failing to attend a settlement conference in the Ontario Small Claims Court?

Retrieved:
- guide-getting-ready-for-court Who attends a settlement confe [0.77]
- oreg-258-98-small-claims-rules r. 13.02 (6)-(7) [0.77]
- oreg-258-98-small-claims-rules r. 13.02 (1)-(5) [0.76]
- oreg-258-98-small-claims-rules r. 13.03 (1)-(3) [0.73]
- guide-getting-ready-for-court If you cannot attend on the da [0.72]
- oreg-258-98-small-claims-rules r. 17.01 (1)-(2.1) [0.72]
- scj-steps-in-a-case Important information for befo [0.71]
- guide-getting-ready-for-court Objecting to change of attenda [0.71]
- scj-steps-in-a-case Trial management conference [0.69]
- guide-getting-ready-for-court Example 3 [0.67]
- oreg-258-98-small-claims-rules r. 17.01 (3)-(5) (ref) [0.72]

### old-loan

Missed: limitations-act-2002 5

Queries:
- What limitation period applies to commencing an action in the Ontario Small Claims Court for repayment of a loan?
- When is a claim for repayment of a loan with a fixed repayment date discovered under the Limitations Act, 2002?
- What effect does an acknowledgment of liability or part payment have on the limitation period for a debt claim?
- How is an action for recovery of an unpaid loan commenced by filing and serving a Plaintiff’s Claim in the Ontario Small Claims Court?

Retrieved:
- limitations-act-2002 s. 13 (1)-(3) [0.72]
- limitations-act-2002 s. 13 (8)-(11) [0.72]
- oreg-258-98-small-claims-rules r. 7.01 (1)-(2) [0.72]
- guide-making-a-claim Checklist: Making a claim [0.72]
- ontario-suing-someone-small-claims If you think you can’t afford  [0.71]
- oreg-258-98-small-claims-rules r. 8.01 (1)-(5.1) [0.71]
- limitations-act-2002 s. 4 [0.70]
- limitations-act-2002 s. 15 (1)-(4) [0.66]
- oreg-258-98-small-claims-rules r. 11.1.01 (1)-(3) [0.65]
- consumer-reporting-act s. 23 (4) [0.62]
- provincial-offences-act s. 76 (1)-(2) [0.61]
- limitations-act-2002 s. 13 (4)-(7) (ref) [0.72]
- oreg-258-98-small-claims-rules r. 8.02 (ref) [0.71]
- oreg-258-98-small-claims-rules r. 8.03 (1)-(3) (ref) [0.71]
- oreg-258-98-small-claims-rules r. 11.03 (1)-(3) (ref) [0.65]
- oreg-258-98-small-claims-rules r. 9.03 (1)-(2) (ref) [0.65]

### collection-calls

Missed: cleo-debt-and-consumer-rights-collection-agency-called-me-do-i-have-talk-them

Queries:
- Under Ontario’s Collection and Debt Settlement Services Act and its regulations, what restrictions apply to a collection agency contacting a debtor at the debtor’s place of employment?
- Is a debtor required to communicate with a collection agency, and what notice may the debtor give to require communications in writing or to request that the matter be taken to court?
- Under the Limitations Act, 2002, how are the limitation period, discoverability, acknowledgment of liability and partial payment applied to an action to recover an unpaid telecommunications debt?
- Under the Rules of the Small Claims Court, what requirements and time limits apply to a defendant serving and filing a defence, including a defence that the claim is barred by a limitation period?

Retrieved:
- cpo-guide-collection-agencies When you can contact a debtor' [0.79]
- oreg-258-98-small-claims-rules r. 9.01 [0.76]
- cpo-guide-collection-agencies If a debtor seeks legal action [0.76]
- guide-serving-documents A defence [0.75]
- guide-making-a-claim How long the defendant to a de [0.75]
- oreg-258-98-small-claims-rules r. 10.03 [0.74]
- cpo-guide-collection-agencies contact the debtor [0.73]
- guide-making-a-claim How long the defendant has to  [0.73]
- cpo-guide-collection-agencies Prohibited practices and condu [0.72]
- limitations-act-2002 s. 13 (8)-(11) [0.70]
- limitations-act-2002 s. 13 (1)-(3) [0.70]
- decision-grant-thornton para. 29 [0.66]
- limitations-act-2002 s. 13 (4)-(7) (ref) [0.70]

### store-slip

Missed: occupiers-liability-act 3

Queries:
- Under the Occupiers’ Liability Act, what duty of care does a grocery store occupier owe to a person entering the premises regarding a spill on the floor and the provision of warning signs?
- How does the Negligence Act apply to contributory negligence in an occupiers’ liability claim arising from a slip and fall?
- What damages may be claimed for personal injury and loss of employment income in an occupiers’ liability action?
- What limitation period under the Limitations Act, 2002 applies to commencing an occupiers’ liability action?
- What monetary jurisdiction and procedures for commencing an action by plaintiff’s claim apply in the Ontario Small Claims Court?

Retrieved:
- oreg-258-98-small-claims-rules r. 7.01 (1)-(2) [0.74]
- ontario-fees-small-claims --> [0.74]
- cja-courts-of-justice-act s. 23 (1)-(2) [0.73]
- oreg-332-16-small-claims-fees s. 1 (1)-(2) [0.72]
- guide-getting-ready-for-court Rule for claims less than $5,0 [0.71]
- decision-waldick  [0.67]
- occupiers-liability-act s. 6.1 (1)-(3) [0.67]
- limitations-act-2002 s. 15 (4)-(6) [0.66]
- decision-waldick  [0.66]
- limitations-act-2002 s. 4 [0.65]
- decision-waldick  [0.65]
- insurance-act s. 267.8 (20)-(22) [0.61]
- cja-courts-of-justice-act s. 11 (1)-(2) (ref) [0.73]
- insurance-act s. 267.8 (1) (ref) [0.61]
- insurance-act s. 267.8 (2)-(4) (ref) [0.61]

### fired-no-notice

Missed: esa-2000-ontario 54

Queries:
- What statutory notice of termination or termination pay is required under the Employment Standards Act, 2000 when an employer terminates an employee’s employment without notice?
- In what circumstances is an employee exempt from entitlement to notice of termination or termination pay because of wilful misconduct, disobedience or wilful neglect of duty?
- What are the eligibility requirements for statutory severance pay under the Employment Standards Act, 2000?
- What common law reasonable notice or damages in lieu of notice may be claimed for wrongful dismissal, and how does an enforceable employment agreement affect that entitlement?
- What monetary jurisdiction, limitation period and procedure apply to commencing a wrongful dismissal action in the Ontario Small Claims Court?
- How does filing a complaint under the Employment Standards Act, 2000 affect an employee’s ability to commence a civil proceeding for wrongful dismissal?

Retrieved:
- esa-2000-ontario s. 98 (1)-(2) [0.77]
- esa-2000-ontario s. 97 (1)-(4) [0.77]
- esa-guide-termination Termination pay [0.74]
- esa-2000-ontario s. 64 (1)-(2) [0.74]
- esa-2000-ontario s. 61 (1)-(1.1) [0.71]
- esa-guide-termination Less than 1 year	 1 week [0.70]
- decision-honda para. 50 [0.69]
- esa-guide-termination Written notice of termination [0.69]
- esa-guide-termination Qualifying for termination not [0.69]
- decision-honda para. 25 [0.67]
- oreg-258-98-small-claims-rules r. 11.1.01 (1)-(3) [0.67]
- decision-whiten para. 78 [0.66]
- esa-2000-ontario s. 57 (ref) [0.71]
- esa-2000-ontario s. 58 (1)-(3) (ref) [0.71]
- oreg-258-98-small-claims-rules r. 11.03 (1)-(3) (ref) [0.67]
- oreg-258-98-small-claims-rules r. 9.03 (1)-(2) (ref) [0.67]

### common-law-notice

Missed: decision-machtinger

Queries:
- In an action for wrongful dismissal before the Ontario Superior Court of Justice, is an employee dismissed as a result of restructuring entitled to common law reasonable notice or damages in lieu of notice beyond minimum entitlements under the Employment Standards Act, 2000?
- What termination pay and severance pay entitlements apply under the Employment Standards Act, 2000 upon termination of employment without cause?
- How are length of service, age, character of employment and availability of similar employment considered in determining the reasonable notice period in a wrongful dismissal action?
- What is a dismissed employee’s duty to mitigate damages, and how does the availability of comparable employment affect damages in a wrongful dismissal action?

Retrieved:
- decision-brake paras. 157-158 [0.80]
- decision-red-deer  [0.77]
- decision-red-deer  [0.76]
- decision-red-deer  [0.76]
- decision-potter para. 77 [0.74]
- esa-2000-ontario s. 64 (1)-(2) [0.73]
- esa-2000-ontario s. 65 (3)-(5) [0.73]
- decision-brake paras. 159-160 [0.73]
- decision-honda para. 50 [0.71]
- decision-potter paras. 30-31 [0.70]
- decision-honda paras. 26-28 [0.70]
- decision-honda para. 25 [0.70]
- esa-2000-ontario s. 57 (ref) [0.73]
- esa-2000-ontario s. 58 (1)-(3) (ref) [0.73]

### vacation-pay

Missed: esa-2000-ontario 38, esa-2000-ontario 11, esa-2000-ontario 35.2, esa-2000-ontario 36

Queries:
- What are an employer’s obligations under the Employment Standards Act, 2000 to pay accrued vacation pay when an employee resigns, and when must that payment be made?
- Does the Ontario Small Claims Court have jurisdiction over an employee’s claim for unpaid vacation pay following resignation?
- What restrictions apply to pursuing a civil proceeding for unpaid vacation pay where an employee has filed a complaint under the Employment Standards Act, 2000?
- What limitation period and commencement requirements apply to a claim for unpaid vacation pay in the Ontario Small Claims Court?

Retrieved:
- esa-2000-ontario s. 76 (1)-(2) [0.80]
- esa-2000-ontario s. 97 (1)-(4) [0.76]
- esa-guide-vacation When employment ends [0.72]
- esa-2000-ontario s. 37 (1)-(2) [0.68]
- esa-2000-ontario s. 35 [0.64]
- termination-and-severance-of-employment s. 7 [0.64]
- decision-brake paras. 120-123 [0.63]

### fired-pregnant

Missed: human-rights-code 5

Queries:
- In a civil proceeding before the Ontario Superior Court of Justice, what statutory protections apply to termination of employment because of pregnancy under the Human Rights Code and the Employment Standards Act, 2000?
- What constitutes discrimination in employment because of sex, including pregnancy, where an employee's position is eliminated following disclosure of pregnancy?
- Under section 46.1 of the Human Rights Code, when may the Ontario Superior Court of Justice grant a remedy for infringement of a right under the Code in a civil proceeding?
- What notice of termination, termination pay, severance pay and common law reasonable notice requirements apply when an employer terminates employment on the basis of position elimination?

Retrieved:
- human-rights-code s. 46.1 (1)-(2) [0.76]
- esa-guide-termination provide a copy of the Form 1 t [0.68]
- decision-machtinger III. Statutory Provisions [0.68]
- termination-and-severance-of-employment s. 3 (1)-(2) [0.68]
- esa-2000-ontario s. 56 (3.4)-(3.6) [0.67]
- decision-jaffer para. 43 [0.66]
- esa-guide-termination Mass termination [0.66]
- esa-2000-ontario s. 65 (3)-(5) [0.66]
- termination-and-severance-of-employment s. 2 (1) [0.66]
- human-rights-code s. 46.2 (1)-(2) [0.66]
- human-rights-code s. 45.2 (1)-(2) [0.66]
- human-rights-code s. 10 (2)-(3) [0.55]
- termination-and-severance-of-employment s. 3 (2)-(3) (ref) [0.68]
- esa-2000-ontario s. 56 (3.1)-(3.3) (ref) [0.67]
- esa-2000-ontario s. 57 (ref) [0.66]
- esa-2000-ontario s. 58 (1)-(3) (ref) [0.66]
- termination-and-severance-of-employment s. 2 (1)-(3) (ref) [0.66]
- human-rights-code s. 9 (ref) [0.66]

### common-law-support

Missed: family-law-act 30

Queries:
- What are the eligibility requirements for an unmarried cohabiting partner to claim spousal support under the Ontario Family Law Act?
- How is entitlement to spousal support determined where a cohabiting partner performed childcare and homemaking responsibilities during the relationship?
- What factors govern the amount and duration of spousal support under the Ontario Family Law Act?
- How does an unmarried former partner commence an application for spousal support in an Ontario court under the Family Law Rules?

Retrieved:
- family-law-act s. 33 (9) [0.70]
- family-law-act s. 7 (1)-(3) [0.70]
- family-law-act s. 33 (1)-(3) [0.68]
- family-law-act s. 29 [0.68]
- divorce-act s. 15.2 (4)-(6) [0.68]
- decision-kerr paras. 84-85 [0.68]
- family-law-rules r. 36 (1)-(4) [0.68]
- decision-bracklow para. 49 [0.68]
- succession-law-reform-act s. 62 (1) [0.67]
- decision-kerr para. 145 [0.67]
- decision-kerr para. 98 [0.67]
- decision-bracklow paras. 59-60 [0.67]
- family-law-act s. 5 (1)-(3) (ref) [0.70]
- divorce-act s. 15.2 (1)-(3) (ref) [0.68]

### money-paid-by-mistake

Missed: decision-garland

Queries:
- Does the Ontario Small Claims Court have jurisdiction over a claim for recovery of money transferred to an unintended recipient by mistake?
- What are the requirements for restitution of a mistaken payment on the basis of unjust enrichment, and what defences may be available to the recipient?
- How is a proceeding for recovery of a mistaken payment commenced by filing and serving a Plaintiff’s Claim in the Ontario Small Claims Court?
- What limitation period applies to an action for recovery of money paid by mistake, and when is the claim discovered?

Retrieved:
- guide-making-a-claim Checklist: Making a claim [0.72]
- ontario-suing-someone-small-claims If you think you can’t afford  [0.70]
- guide-making-a-claim a motion in writing for an ass [0.70]
- oreg-258-98-small-claims-rules r. 7.01 (1)-(2) [0.69]
- decision-kerr paras. 47-48 [0.61]
- decision-kerr para. 55 [0.61]
- decision-kerr paras. 75-76 [0.60]
- guide-after-judgment Enforcing an order from anothe [0.60]
- limitations-act-2002 s. 5 (1)-(3) [0.59]
