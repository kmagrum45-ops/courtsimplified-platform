# Beta finish line — case by case

From the page walkthrough (20 fabricated cases) and the critic. pass / FAIL / n/a (the journey never reached what the check needs). Checks: docs/MASTER_PLAN.md.

| Case | nextForm | deadline | fileFeeService | noRepeat | onTopic | sourced | noGrading | limits | conversation |
|---|---|---|---|---|---|---|---|---|---|
| probe-lien-interlock-civil | **FAIL** | **FAIL** | **FAIL** | **FAIL** | **FAIL** | **FAIL** | **FAIL** | **FAIL** | **FAIL** |
| probe-lien-interlock-guided | **FAIL** | **FAIL** | **FAIL** | **FAIL** | **FAIL** | pass | pass | **FAIL** | **FAIL** |
| **passed / failed** | 0 / 2 | 0 / 2 | 0 / 2 | 0 / 2 | 0 / 2 | 1 / 1 | 1 / 1 | 0 / 2 | 0 / 2 |

## Why each check failed

- **probe-lien-interlock-civil**: the run did not finish ([2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed)
  - seen: `POST /api/civil/analyze 400 {"ok":false,"error":"A complete Civil intake is required."}`
- **probe-lien-interlock-civil** · noRepeat: The site asks 'When did you enter into the contract for the interlock work?' after receiving the June 2026 hiring timeline, and asks about money already described in the story.
- **probe-lien-interlock-civil** · limits: The blocking message 'A complete Civil intake is required' neither explains the site's inability to proceed nor points the homeowner to help.
- **probe-lien-interlock-civil** · conversation: The conversation initially acknowledges answers and asks one question at a time, but repeats known information and ends with an unexplained completion barrier despite 'That's everything we need for now.'
- **probe-lien-interlock-guided** · nextForm: The next-step card names 'Form 9A — Defence' even though this is a Superior Court lien matter and service of a court claim is unconfirmed.
- **probe-lien-interlock-guided** · deadline: Despite the known September 9, 2026 registration date, the journey gives no usable lien preservation or perfection calculation and ends with 'Deadlines worked out from your dates — None yet.'
- **probe-lien-interlock-guided** · fileFeeService: The pages show 'Filing a defence: $77' and Small Claims filing and service instructions, but not the filing, fee and service package applicable to this homeowner's actual Superior Court options.
- **probe-lien-interlock-guided** · noRepeat: Results ask 'How were the papers served?' after intake recorded uncertainty about any served claim, and the timeline asks when hiring happened despite the saved June 2026 answer.
- **probe-lien-interlock-guided** · onTopic: The saved pages prominently display 'ONTARIO SMALL CLAIMS COURT' and an unsupported served-claim defence step instead of the construction-lien matter.
- **probe-lien-interlock-guided** · limits: Although generic help links appear, the site never says its current workflow cannot handle this lien and over-limit claim, instead continuing to call it a 'Small Claims case'.
- **probe-lien-interlock-guided** · conversation: The conversation summarises the defective work but ignores 'I only found out about the lien from a letter from the land registry' and continues asking about an unseen Plaintiff's Claim and Form 9A.
