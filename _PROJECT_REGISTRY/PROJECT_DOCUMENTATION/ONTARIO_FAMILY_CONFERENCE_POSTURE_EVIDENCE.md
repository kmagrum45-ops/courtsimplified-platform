# Ontario Family Conference Posture Evidence

## Scope and safety boundary

This evidence packet considers only the Family Law Rules conference records currently present in the readonly catalogue export. Exact form identity is always the pair `canonical_form_id + court_type`; title, form number, file path, and stage cannot substitute for that pair. This is research and contract design only. It creates no recommendation, mapping, database change, UI/API/resolver change, or conclusion about conference type, timing, service, evidence, urgency, merits, or filing readiness.

The existing selected-case storage model is retained: any later fact belongs only in `master_result.formApplicability`. The existing route accepts a question only where a mapping declares it, and its generic conflict rule suppresses a field when two active mappings declare non-identical question metadata for the same `field_path`. That is a useful fail-closed boundary, not a reason to create a separate registry or per-form UI branch.

## Official-source evidence

Ontario Court Services' [Family Law Rules Forms catalogue](https://ontariocourtforms.on.ca/en/family-law-rules-forms/) lists Form 17A as **Case Conference Brief - General** (version Sept. 1, 2023; effective Nov. 27, 2023), Form 17B as **Case conference brief for protection application or status review** (version March 1, 2018; effective April 30, 2018), Form 17C as **Settlement Conference Brief - General** (version Sept. 1, 2023; effective Nov. 27, 2023), and Form 17D as **Settlement conference brief for protection application or status review** (version Sept. 1, 2023; effective Nov. 27, 2023). The specific official pages corroborate the Form 17B and Form 17D title/version/effective information: [17B](https://ontariocourtforms.on.ca/en/family-law-rules-forms/17b-1/) and [17D](https://ontariocourtforms.on.ca/en/family-law-rules-forms/17d/).

The official Family Law Rules, O. Reg. 114/99, Rule 17(13), names the brief families for each conference: Form 17A or 17B for a case conference, Form 17C or 17D for a settlement conference, and Form 17E for a trial management conference. Rule 17(4.1) is the source identified in the existing evidence for the Form 17 Conference Notice request posture. These provisions identify form families; they do not establish that a particular party, case, conference, date, service, document, or filing is appropriate. The official source is [O. Reg. 114/99, Family Law Rules](https://www.ontario.ca/laws/regulation/990114/v1).

## Current catalogue and mapping findings

| Exact identity | Current record | Current mapping / evidence outcome |
| --- | --- | --- |
| `b2b46bcf-97ae-42e4-9d01-4a962ea83a2a + family` | Form 17A; `conference`; one catalogue version; current form source/provenance is incomplete in the readonly clean view. | An active verified mapping exists with `formApplicability.family.conferenceBriefType=case-conference-brief-general`. Its question also exposes generic settlement/trial and child-protection/status-review choices. It is not the exact shared contract proposed below. |
| `5310b079-0ede-4b63-8fbc-dbb04319fc66 + family` | Form 17B; `conference`; three versions; protection/status-review title matches the official catalogue. | No safe beta candidate: special child-protection/status-review context remains review-required. |
| `d2a6b784-5ac5-491e-860c-8b02645d4957 + family` | A second active Form 17B identity with the generic title `Case Conference Brief`; `conference`. | Identity conflict with the official Form 17B title and first 17B record; no shared contract or mapping. |
| `7ef801e0-5296-4019-9e93-ed2853133207 + family` | Form 17C; `conference`; one version; title omits the official `- General` qualification. | Identity/provenance conflict; exclude. |
| `2013f42e-7316-4195-8b9e-4598f94f5403 + family` | Form 17C; `conference`; two versions; official general title and paths. | The only unmapped general settlement-brief candidate, but it sits beside the conflicting Form 17C identity and has no current compatible shared-question contract. Review-required. |
| `ebb42456-5262-487b-aa9e-a3e4d766e332 + family` | Present in earlier raw export as Form 17D but absent as a usable canonical ID in the current clean view; prior stage was `starting-case`. | Current exact identity cannot be relied upon; protection/status-review context is independently excluded. |

Form 17 (Conference Notice) is a separate request posture rather than a conference-brief category. Forms 17E and 17F are respectively trial-management and confirmation/timing records. They do not share the limited general case/settlement brief fact and remain out of scope for this one contract.

## Exact proposed shared posture contract (design only)

**Path:** `formApplicability.family.generalConferenceBriefPosture`  
**Type:** `string`  
**Canonical stage:** `conference`  
**Allowed values:**

- `general-case-conference-brief`
- `general-settlement-conference-brief`
- `another-family-conference-brief`
- `not-sure`

**One generic question:** “Which general Family Law Rules conference brief are you preparing?”

The first value could only ever be associated with the exact Form 17A identity above; the second only with the exact, official-title Form 17C identity `2013f42e-7316-4195-8b9e-4598f94f5403 + family`. `another-family-conference-brief` and `not-sure` resolve no form. This contract intentionally has no child-protection/status-review value and does not represent Form 17, 17B, 17D, 17E, or 17F.

It is non-overlapping with the existing `conferenceBriefType` field because that field has a broader question and includes special-context and non-specific choices. Adding a second field to route Form 17A while its active mapping uses the old field would create two incompatible facts for the same form; the generic conflict rule also prevents any same-path contract whose question metadata differs. Therefore the proposed field is a future replacement contract, not an additive routing instruction.

## Conclusion: no safe implementation

There is **no safe implementation** at this time.

The precise blockers are:

1. The active Form 17A mapping declares a different, broader `conferenceBriefType` question; it must first be independently reviewed and replaced or reconciled with one exact shared contract. This task does not change it.
2. The Form 17C catalogue contains two active canonical identities, one of which lacks the official `- General` qualifier. A canonical-survivor/identity review is required before the exact Form 17C candidate can be mapped.
3. Form 17B and Form 17D concern protection applications or status review. That special context remains review-required and is deliberately outside this general beta contract.
4. Form 17D is not currently available as a usable exact canonical identity in the current clean export; its prior `starting-case` stage also conflicts with the conference workflow.

If and only if all four blockers are resolved in a later separately authorized review, the limited candidate mapping set is Form 17A (`b2b46bcf-97ae-42e4-9d01-4a962ea83a2a + family`) for `general-case-conference-brief` and Form 17C (`2013f42e-7316-4195-8b9e-4598f94f5403 + family`) for `general-settlement-conference-brief`, both at `conference`. That later review must re-verify current official pages/revisions, Rule 17(13), catalogue provenance, exact question metadata, and fail-closed resolver conditions. It must not infer conference type or certify service, timing, evidence, urgency, filing readiness, or merits.
