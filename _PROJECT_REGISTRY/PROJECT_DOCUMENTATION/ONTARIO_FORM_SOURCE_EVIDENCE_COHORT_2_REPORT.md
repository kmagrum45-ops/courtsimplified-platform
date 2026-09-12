# Ontario Form Source Evidence — Cohort 2

Checked: 2026-08-12  
Scope: the next 25 remaining `provenance-missing`, user-facing canonical identities in the live-derived routing queue after excluding Cohort 1 and all mapped identities. The queue had no remaining eligible Civil identity; this cohort therefore contains 13 Small Claims and 12 Family identities.

## Method and boundary

The cohort was selected from the routing queue by exact canonical identity, queue classification, user-facing flag, and court area—not by title. Each result was checked only against Ontario Court Forms and Ontario e-Laws. An Ontario Court Forms page establishes the displayed form identity and its version/effective data; it does not certify a recommendation. Rule pinpoints are listed only where the official source directly tied the form to the provision.

No item in this file is `verified-for-workflow`. No mapping, catalogue row, migration, application code, route, resolver, or database state was changed.

## Results

| Status | Count |
| --- | ---: |
| official-identity-verified-needs-posture | 8 |
| official-identity-ambiguous | 15 |
| official-page-unavailable | 1 |
| rule-support-insufficient | 1 |
| court-only-not-user-facing | 0 |

### Small Claims (13)

- `4300c97c-a430-45b4-b7cb-da90f0d9be20`: Ontario Court Forms confirms Form 11.3A, Notice of Discontinued Claim, version January 23 2014 / effective July 18 2014. Small Claims Court Rule 11.3.01 limits it to a plaintiff discontinuing an undefended claim and excludes disability cases without leave. The canonical row needs a display/stage repair before any later posture work.
- `3915228f-c604-43b8-9406-cf158d057137`: the expected Form 11A official page was unavailable. The live title conflicts with the separately verified Form 15A motion identity; no legal-purpose inference was made.
- `6cdaec7b-5e8b-4f31-a360-580fc85660d3` and `c64b6ee4-f865-4da7-a8e9-6d26762d7098`: both are active canonical identities for the same Form 15A official identity. Rule 15.01 directly identifies Form 15A, but a duplicate-identity repair is required before a posture can be considered.
- `f7ba6b3f-ad58-49f2-8c1d-affc12835d2f`: the official Form 20A page is Certificate of Judgment, while the live row says Notice of Garnishment; it is an identity conflict.
- `1a170388-b11c-4642-a61a-bb95cb6da8ac` and `2f3b3dbb-0799-4d81-bcc3-03c2116dfe4d`: competing Form 20B active identities with different titles; the exact official page was not retrievable.
- `78946826-4c9a-4a4d-907b-3cda465d7869`: official Form 20D is Writ of Seizure and Sale of Land (May 1 2025 / October 6 2025), not the live affidavit title.
- `49b1171a-5a50-4067-9035-59c8626fade8`: official Form 20E is Notice of Garnishment (January 1 2021 / March 1 2021), not the live writ title.
- `29a85a4b-05bb-47e6-ac3a-75c9c614973c` and `5ad2929b-c763-4f87-b0cf-cb062835b293`: duplicate Form 20N identities. Rule 20.06(3) describes renewal, but the duplicate identity and unavailable expected page block routing.
- `f059db48-516f-4342-b463-10a9122de6a2`: official Form 20O identity is confirmed (January 23 2014 / July 18 2014). It needs an explicit existing-personal-property-writ enforcement posture, and its enforcement preconditions remain unverified for routing.
- `66684b2b-c031-488e-8e19-c0c4d40c4d6c`: official Form 20P identity is confirmed (January 1 2021 / March 1 2021). Rule 20.06(1) requires an order, default, and an affidavit stating the amount owing; a later route would need a narrow enforcement posture and still could not certify validity.

### Family (12)

- `4f1eed91-6a00-4111-b28d-d0231ad385bc`: official Form 15D is confirmed (December 1 2020 / March 1 2021). Rule 15(18) confines it to a consent child-support-only change to a final order/agreement. A future fact would need to capture that exact posture; attachments, consent sufficiency, and filing remain outside routing.
- `edd91020-9fea-4294-a01c-695236c5b3f6`: official Form 17 is confirmed (November 1 2018 / January 1 2019). Rule 17(4.1) ties it to a party asking for a case conference. Court scheduling remains review-required.
- `5310b079-0ede-4b63-8fbc-dbb04319fc66` and `d2a6b784-5ac5-491e-860c-8b02645d4957`: both refer to official Form 17B (March 1 2018 / April 30 2018) but disagree in the live catalogue on stage/title. Rule 17(13) is confirmed, yet no canonical routing identity is safe until duplicate reconciliation.
- `7ef801e0-5296-4019-9e93-ed2853133207`: official Form 17C General is confirmed (September 1 2023 / November 27 2023). Rule 17(13) directly supports a settlement-conference-brief posture; the general/protection distinction remains fail-closed.
- `ebb42456-5262-487b-aa9e-a3e4d766e332`: official Form 17D protection/status-review identity is confirmed (September 1 2023 / November 27 2023). Its live `starting-case` stage is not adequate for a conference brief; a catalogue stage repair and an exact protected-case posture would be prerequisites.
- `daabe088-303b-43ac-8444-c668ebd05230`: official Form 17F is confirmed (September 24 2024 / January 22 2025). Rule 17(14) attaches it to scheduled-conference delivery/timing; no standalone generic fact safely captures that requirement.
- `c3883a2e-2e38-41fc-b7d1-c3320e291344`: official Form 23C is confirmed (December 1 2020 / March 1 2021). Rule 23(22) identifies its uncontested-trial use, but evidence and service boundaries remain review-required.
- `232d5817-e2d1-4960-a5c6-9d358d84d60e`, `42e5c374-4f93-4542-99ca-2de1145d8828`, `ab1f9c76-2d70-4798-bcd8-77080920e906`, and `4c566883-1256-47ce-bedb-381a0aabae69`: the live generic "Enforcement Form" titles cannot prove which official Form 27/27A/27B/27C identity each UUID represents. They remain ambiguous without a direct official identity link.

## Not a routing batch

The verified-identity rows identify research prerequisites only. They are not a proposed migration cohort because the remaining blockers include catalogue identity/stage repairs, duplicate canonical identities, enforcement requirements, scheduled-event timing, and evidence/service boundaries. All forms remain review-required.

## Official sources consulted

- https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/113a/
- https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/20a/
- https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/20d/
- https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/20e/
- https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/20o/
- https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/20p-1/
- https://ontariocourtforms.on.ca/en/family-law-rules-forms/15d-1/
- https://ontariocourtforms.on.ca/en/family-law-rules-forms/17-1/
- https://ontariocourtforms.on.ca/en/family-law-rules-forms/17b-1/
- https://ontariocourtforms.on.ca/en/family-law-rules-forms/17c/
- https://ontariocourtforms.on.ca/en/family-law-rules-forms/17d/
- https://ontariocourtforms.on.ca/en/family-law-rules-forms/17f-1/
- https://ontariocourtforms.on.ca/en/family-law-rules-forms/23c-1/
- https://www.ontario.ca/laws/regulation/980258
- https://www.ontario.ca/laws/regulation/990114
