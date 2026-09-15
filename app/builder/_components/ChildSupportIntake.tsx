"use client";

/**
 * The child support screen — Family Law Act s. 33 path, first application.
 *
 * *** THE COMMON CASE IS THE DEFAULT, AND IT IS FOUR QUESTIONS ***
 *
 * One or two children, no spousal support, no s. 7 claim, never married. That
 * user answers four questions plus one yes/no, and gets a draft. Everything
 * else is a collapsed disclosure, closed on load, and a user who never opens
 * one never sees a field belonging to it.
 *
 * THE SECOND INCOME FIELD IS NOT RENDERED, NOT RENDERED-AND-EMPTY. Its absence
 * is the answer — see childSupportDraftEngine.ts, which omits it from the draft
 * rather than defaulting it. A screen that showed an empty second income box to
 * every user would undo that at the only point where it is visible.
 *
 * *** WHAT IT SAYS BEFORE THE FIRST QUESTION ***
 *
 * That it does not calculate the amount. At the top, not at the end. A user
 * who reaches question four still expecting a number has been misled for four
 * questions, and the fix is one line before question one rather than a
 * disclaimer under the draft.
 *
 * *** THE RESIDENCE QUESTION IS NOT AN ADDRESS FIELD ***
 *
 * O. Reg. 391/97 s. 2 (1) selects the table for the province where the parent
 * or spouse AGAINST WHOM THE ORDER IS SOUGHT ordinarily resides. A wrong answer
 * silently produces the wrong table and nothing downstream can detect it, so it
 * gets its own question with the reason stated rather than a line inside
 * "who are the parties".
 *
 * *** NO READINESS GATE ON THIS PATH ***
 *
 * Deliberate, and verified rather than assumed: `evaluateReadinessGate` takes a
 * ClaimType, there is no family ClaimType among the 22, and no SUPPORT_ELEMENT
 * id appears on any of them. Wiring it here would return
 * `no-confirmed-claim-type` forever and the draft would never be available.
 *
 * The draft is safe to produce incomplete, which is the real difference between
 * the two paths: a Statement of Claim full of bracketed placeholders is a
 * pleading someone might file, while a child support draft saying "No figure
 * recorded" is doing exactly what it should, because the figure is one a court
 * determines anyway. See docs/OUTSTANDING_ISSUES.md.
 *
 * *** SUGGEST, NEVER DECIDE ***
 *
 * Out-of-scope notices surface a topic and hand the question back. They never
 * say the user's situation IS a variation, never block, and never reroute.
 */

import { useMemo, useState } from "react";

import {
  draftChildSupportApplication,
  type ChildSupportDraftInput,
  type StatedIncome,
} from "../../../src/lib/case-system/family/childSupportDraftEngine";
import { scopeNoticesFor } from "../../../src/lib/case-system/family/childSupportScope";
import {
  COURT_DETERMINES_INCOME,
  ONTARIO_GUIDELINES_URL,
} from "../../../src/lib/case-system/family/childSupportFlaPath";

type IncomeFields = { stated: string; basisStated: string; agreedInWriting: boolean };

const emptyIncome = (): IncomeFields => ({ stated: "", basisStated: "", agreedInWriting: false });

function toStatedIncome(fields: IncomeFields): StatedIncome | undefined {
  if (!fields.stated.trim()) return undefined;
  return {
    stated: fields.stated,
    basisStated: fields.basisStated,
    // The agreed-in-writing control lives ON the income question because it
    // changes how that answer is read — s. 15 (2) lets a court treat an agreed
    // figure as the person's income. A separate disclosure would divorce the
    // qualifier from the number it qualifies.
    statedBy: fields.agreedInWriting ? "both-parties-in-writing" : "user",
  };
}

const LABEL = "block text-sm font-semibold text-[#10231f]";
const INPUT =
  "mt-1 w-full rounded-xl border border-[#d8e6df] bg-white px-3 py-2 text-sm text-[#10231f]";
const HELP = "mt-1 text-sm text-[#4f685f]";

function Disclosure({
  id,
  label,
  open,
  onToggle,
  children,
}: {
  id: string;
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3 rounded-xl border border-[#d8e6df] bg-white">
      <button
        type="button"
        data-testid={`disclosure-${id}`}
        data-open={open ? "true" : "false"}
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-[#10231f]"
      >
        <span>{label}</span>
        <span aria-hidden className="text-[#4f685f]">
          {open ? "−" : "+"}
        </span>
      </button>
      <div hidden={!open} data-testid={`disclosure-body-${id}`} className="px-4 pb-4">
        {children}
      </div>
    </div>
  );
}

export default function ChildSupportIntake() {
  // ---- The common case ----
  const [applicantName, setApplicantName] = useState("");
  const [applicantAddress, setApplicantAddress] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [respondentAddress, setRespondentAddress] = useState("");
  const [childrenDescribed, setChildrenDescribed] = useState("");
  const [parentingTimeDescribed, setParentingTimeDescribed] = useState("");
  const [incomeForTable, setIncomeForTable] = useState<IncomeFields>(emptyIncome);
  const [incomeDocumentsHeld, setIncomeDocumentsHeld] = useState("");

  /** null = not answered. The engine treats undefined as "not recorded". */
  const [tableAmountOnly, setTableAmountOnly] = useState<boolean | null>(null);

  // ---- The three disclosures, closed on load ----
  const [sectionSevenOpen, setSectionSevenOpen] = useState(false);
  const [propertyOpen, setPropertyOpen] = useState(false);

  const [sectionSevenExpenses, setSectionSevenExpenses] = useState("");
  const [insuranceShareDescribed, setInsuranceShareDescribed] = useState("");
  const [incomeForSectionSeven, setIncomeForSectionSeven] = useState<IncomeFields>(emptyIncome);
  const [propertyClaim, setPropertyClaim] = useState<boolean | null>(null);

  const [showDraft, setShowDraft] = useState(false);

  const notices = useMemo(
    () => scopeNoticesFor(childrenDescribed, parentingTimeDescribed, sectionSevenExpenses),
    [childrenDescribed, parentingTimeDescribed, sectionSevenExpenses],
  );

  const draftInput: ChildSupportDraftInput = useMemo(
    () => ({
      applicantName,
      applicantAddress,
      respondentName,
      respondentAddress,
      childrenDescribed,
      parentingTimeDescribed,
      incomeForTable: toStatedIncome(incomeForTable),
      // OMITTED unless the s. 7 disclosure is open AND a figure was entered.
      // Closing the disclosure withdraws the figure from the draft, because a
      // user who closed it is telling us it does not apply.
      incomeForSectionSeven: sectionSevenOpen ? toStatedIncome(incomeForSectionSeven) : undefined,
      sectionSevenExpenses: sectionSevenOpen
        ? sectionSevenExpenses.split("\n").map((line) => line.trim()).filter(Boolean)
        : [],
      insuranceShareDescribed: sectionSevenOpen ? insuranceShareDescribed : "",
      incomeDocumentsHeld: incomeDocumentsHeld
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      propertyOrExclusivePossessionClaim: propertyOpen
        ? propertyClaim === null
          ? undefined
          : propertyClaim
        : false,
      onlyClaimIsTableAmountChildSupport:
        tableAmountOnly === null ? undefined : tableAmountOnly && !sectionSevenOpen,
    }),
    [
      applicantName,
      applicantAddress,
      respondentName,
      respondentAddress,
      childrenDescribed,
      parentingTimeDescribed,
      incomeForTable,
      incomeForSectionSeven,
      sectionSevenOpen,
      sectionSevenExpenses,
      insuranceShareDescribed,
      incomeDocumentsHeld,
      propertyOpen,
      propertyClaim,
      tableAmountOnly,
    ],
  );

  const draft = useMemo(() => draftChildSupportApplication(draftInput), [draftInput]);

  return (
    <section data-testid="child-support-intake" className="mt-8">
      <h2 className="text-2xl font-bold text-[#10231f]">Child support</h2>

      {/* THE LINE THAT GOES FIRST. See the file header. */}
      <p
        data-testid="child-support-no-calculation-notice"
        className="mt-3 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm text-[#10231f]"
      >
        <strong>This produces your application and the rule that decides the amount. It does not
        calculate the amount.</strong>{" "}
        The figure comes from a table that takes an income defined by O. Reg. 391/97 s. 16 and
        adjusted by Schedule III, and ss. 17 to 20 let a court determine that income differently
        again. Nothing on this site works out what you would receive or owe.
      </p>

      {/* ---- 1. Parties ---- */}
      <div className="mt-6 rounded-2xl border border-[#d8e6df] bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#4f685f]">Question 1</p>
        <label className={LABEL} htmlFor="cs-applicant-name">
          Who is applying, and who is the application against?
        </label>
        <input
          id="cs-applicant-name"
          data-testid="cs-applicant-name"
          className={INPUT}
          value={applicantName}
          onChange={(event) => setApplicantName(event.target.value)}
          placeholder="Your full legal name"
        />
        <input
          data-testid="cs-applicant-address"
          className={INPUT}
          value={applicantAddress}
          onChange={(event) => setApplicantAddress(event.target.value)}
          placeholder="Your address for service"
        />
        <input
          data-testid="cs-respondent-name"
          className={INPUT}
          value={respondentName}
          onChange={(event) => setRespondentName(event.target.value)}
          placeholder="The other parent's full legal name"
        />
      </div>

      {/* ---- 2. Where the other parent lives. Its own question, deliberately. ---- */}
      <div className="mt-4 rounded-2xl border border-[#d8e6df] bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#4f685f]">Question 2</p>
        <label className={LABEL} htmlFor="cs-respondent-address">
          Where does the other parent ordinarily live?
        </label>
        <p className={HELP} data-testid="cs-residence-reason">
          This decides which table applies, so it is worth getting right. O. Reg. 391/97 s. 2 (1)
          selects the table for the province or territory where{" "}
          <strong>the parent the order is sought against</strong> ordinarily resides — not where you
          live, not where the children live, and not where the case is filed. If they live outside
          Ontario, a different province&rsquo;s table applies.
        </p>
        <input
          id="cs-respondent-address"
          data-testid="cs-respondent-address"
          className={INPUT}
          value={respondentAddress}
          onChange={(event) => setRespondentAddress(event.target.value)}
          placeholder="City and province, and their address for service if you have it"
        />
      </div>

      {/* ---- 3. Children ---- */}
      <div className="mt-4 rounded-2xl border border-[#d8e6df] bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#4f685f]">Question 3</p>
        <label className={LABEL} htmlFor="cs-children">
          Tell me about the children this is for.
        </label>
        <p className={HELP}>
          Each child&rsquo;s age, and what each is doing now — at school, working, or something
          else. In your own words; this goes into the application as you write it.
        </p>
        <textarea
          id="cs-children"
          data-testid="cs-children"
          rows={3}
          className={INPUT}
          value={childrenDescribed}
          onChange={(event) => setChildrenDescribed(event.target.value)}
        />
      </div>

      {/* ---- 4. Parenting time ---- */}
      <div className="mt-4 rounded-2xl border border-[#d8e6df] bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#4f685f]">Question 4</p>
        <label className={LABEL} htmlFor="cs-parenting-time">
          How is the children&rsquo;s time divided between you at the moment?
        </label>
        <p className={HELP}>
          Recorded as you describe it. Whether O. Reg. 391/97 s. 8 or s. 9 applies to an
          arrangement is for the court; nothing here decides that.
        </p>
        <textarea
          id="cs-parenting-time"
          data-testid="cs-parenting-time"
          rows={3}
          className={INPUT}
          value={parentingTimeDescribed}
          onChange={(event) => setParentingTimeDescribed(event.target.value)}
        />
      </div>

      {/* ---- 5. Income, with the agreed-figure control attached to it ---- */}
      <div className="mt-4 rounded-2xl border border-[#d8e6df] bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#4f685f]">Question 5</p>
        <label className={LABEL} htmlFor="cs-income">
          What is the other parent&rsquo;s annual income, and where does that figure come from?
        </label>
        <p className={HELP}>
          Write it however you know it. If you are unsure, say so in your own words — &ldquo;about
          $60,000&rdquo; is recorded as you wrote it and is not rounded or changed.
        </p>
        <input
          id="cs-income"
          data-testid="cs-income-table"
          className={INPUT}
          value={incomeForTable.stated}
          onChange={(event) =>
            setIncomeForTable((current) => ({ ...current, stated: event.target.value }))
          }
          placeholder="e.g. about $60,000"
        />
        <input
          data-testid="cs-income-table-basis"
          className={INPUT}
          value={incomeForTable.basisStated}
          onChange={(event) =>
            setIncomeForTable((current) => ({ ...current, basisStated: event.target.value }))
          }
          placeholder="Where the figure comes from — e.g. line 15000 of their 2025 notice of assessment"
        />

        <label className="mt-3 flex items-start gap-2 text-sm text-[#10231f]">
          <input
            type="checkbox"
            data-testid="cs-income-agreed-in-writing"
            checked={incomeForTable.agreedInWriting}
            onChange={(event) =>
              setIncomeForTable((current) => ({ ...current, agreedInWriting: event.target.checked }))
            }
          />
          <span>
            We have both agreed on this figure, in writing.
            <span className="block text-[#4f685f]">
              O. Reg. 391/97 s. 15 (2) provides that where both parties agree in writing on the
              annual income of a party, the court may consider that amount to be their income if it
              thinks the amount is reasonable having regard to the income information provided under
              s. 21. A figure agreed in writing and a figure one person states are read differently,
              so the application says which this is.
            </span>
          </span>
        </label>

        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-[#2f7d67]">
            When a court works out the income figure itself
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#4f685f]">
            {COURT_DETERMINES_INCOME.map((item) => (
              <li key={item.pinpoint}>
                <strong>{item.pinpoint}</strong> — {item.summary}
              </li>
            ))}
          </ul>
        </details>
      </div>

      {/* ---- 6. The r. 13 (1.3) question ---- */}
      <div className="mt-4 rounded-2xl border border-[#d8e6df] bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#4f685f]">Question 6</p>
        <p className={LABEL}>Is this only about the table amount for the children?</p>
        <p className={HELP}>
          If it is — no spousal support, no share of special expenses, nothing about property —
          Family Law Rules r. 13 (1.3) means you do not have to file a financial statement at all.
          That is a whole form you would otherwise complete.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            data-testid="cs-table-only-yes"
            data-selected={tableAmountOnly === true ? "true" : "false"}
            onClick={() => setTableAmountOnly(true)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              tableAmountOnly === true
                ? "border-[#2f7d67] bg-[#2f7d67] text-white"
                : "border-[#d8e6df] bg-white text-[#10231f]"
            }`}
          >
            Yes, only the table amount
          </button>
          <button
            type="button"
            data-testid="cs-table-only-no"
            data-selected={tableAmountOnly === false ? "true" : "false"}
            onClick={() => setTableAmountOnly(false)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              tableAmountOnly === false
                ? "border-[#2f7d67] bg-[#2f7d67] text-white"
                : "border-[#d8e6df] bg-white text-[#10231f]"
            }`}
          >
            No, there is more to it
          </button>
        </div>
      </div>

      {/* ---- 7. Documents ---- */}
      <div className="mt-4 rounded-2xl border border-[#d8e6df] bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#4f685f]">Question 7</p>
        <label className={LABEL} htmlFor="cs-documents">
          Which income documents do you already have? One per line.
        </label>
        <p className={HELP}>
          O. Reg. 391/97 s. 21 (1) lists what has to go with the application, including income tax
          returns and notices of assessment for the three most recent taxation years. Listing none
          is a real answer — the application says so rather than leaving a blank.
        </p>
        <textarea
          id="cs-documents"
          data-testid="cs-documents"
          rows={3}
          className={INPUT}
          value={incomeDocumentsHeld}
          onChange={(event) => setIncomeDocumentsHeld(event.target.value)}
        />
      </div>

      {/* ---- The disclosures. Closed on load. ---- */}
      <p className="mt-6 text-sm font-semibold text-[#10231f]">
        Only if they apply to you
      </p>
      <p className="text-sm text-[#4f685f]">
        Most applications need none of these. Nothing below is filled in unless you open it.
      </p>

      <Disclosure
        id="section-seven"
        label="I am also claiming special or extraordinary expenses"
        open={sectionSevenOpen}
        onToggle={() => setSectionSevenOpen((open) => !open)}
      >
        <p className="text-sm text-[#4f685f]">
          O. Reg. 391/97 s. 7 covers six kinds of expense, including child care resulting from the
          parent&rsquo;s employment, illness, disability or education; the child&rsquo;s share of
          medical and dental insurance premiums; health expenses exceeding insurance reimbursement
          by at least $100 a year; extraordinary school expenses; post-secondary expenses; and
          extraordinary expenses for extracurricular activities. Whether an expense is necessary and
          reasonable is for the court.
        </p>
        <label className={`${LABEL} mt-3`} htmlFor="cs-section-seven">
          What are you claiming? One per line, in your own amounts.
        </label>
        <textarea
          id="cs-section-seven"
          data-testid="cs-section-seven-expenses"
          rows={3}
          className={INPUT}
          value={sectionSevenExpenses}
          onChange={(event) => setSectionSevenExpenses(event.target.value)}
        />
        <label className={`${LABEL} mt-3`} htmlFor="cs-insurance">
          The children&rsquo;s share of medical or dental insurance premiums, if you pay it
        </label>
        <input
          id="cs-insurance"
          data-testid="cs-insurance-share"
          className={INPUT}
          value={insuranceShareDescribed}
          onChange={(event) => setInsuranceShareDescribed(event.target.value)}
        />

        {/* THE SECOND INCOME FIELD EXISTS ONLY HERE. */}
        <div className="mt-4 rounded-xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
          <p className="text-sm font-bold text-[#10231f]">
            A second income figure, if spousal support is paid or received
          </p>
          <p className={HELP} data-testid="cs-two-income-explanation">
            Schedule III treats spousal support differently depending on what is being worked out.
            <strong> Item 3</strong>, for the table amount, deducts spousal support{" "}
            <strong>received</strong> from the other party. <strong>Item 3.1</strong>, for section
            7, deducts spousal support <strong>paid</strong> to the other party. Where support moves
            between you, the two figures are not the same number. If no spousal support is paid or
            received, leave this empty — the application then carries one figure, not two.
          </p>
          <input
            data-testid="cs-income-section-seven"
            className={INPUT}
            value={incomeForSectionSeven.stated}
            onChange={(event) =>
              setIncomeForSectionSeven((current) => ({ ...current, stated: event.target.value }))
            }
            placeholder="Annual income for the section 7 calculation"
          />
          <input
            data-testid="cs-income-section-seven-basis"
            className={INPUT}
            value={incomeForSectionSeven.basisStated}
            onChange={(event) =>
              setIncomeForSectionSeven((current) => ({
                ...current,
                basisStated: event.target.value,
              }))
            }
            placeholder="Where that figure comes from"
          />
        </div>
      </Disclosure>

      <Disclosure
        id="property"
        label="I am also asking for something about property or the home"
        open={propertyOpen}
        onToggle={() => setPropertyOpen((open) => !open)}
      >
        <p className="text-sm text-[#4f685f]">
          Family Law Rules r. 13 (1.2): where the application contains a property claim or a claim
          for exclusive possession of the matrimonial home and its contents, the financial statement
          &ldquo;shall be in Form 13.1, whether a claim for support is also included or not&rdquo;.
          It also means r. 13 (1.3)&rsquo;s exception cannot apply.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            data-testid="cs-property-yes"
            data-selected={propertyClaim === true ? "true" : "false"}
            onClick={() => setPropertyClaim(true)}
            className="rounded-full border border-[#d8e6df] bg-white px-4 py-2 text-sm font-semibold text-[#10231f]"
          >
            Yes, there is a property or home claim
          </button>
          <button
            type="button"
            data-testid="cs-property-no"
            data-selected={propertyClaim === false ? "true" : "false"}
            onClick={() => setPropertyClaim(false)}
            className="rounded-full border border-[#d8e6df] bg-white px-4 py-2 text-sm font-semibold text-[#10231f]"
          >
            No
          </button>
        </div>
      </Disclosure>

      {/* ---- Out-of-scope notices. Surfaced, never blocking. ---- */}
      {notices.length > 0 && (
        <div data-testid="cs-scope-notices" className="mt-6 space-y-3">
          {notices.map((notice) => (
            <section
              key={notice.id}
              data-testid={`cs-scope-notice-${notice.id}`}
              className="rounded-2xl border border-amber-300 bg-amber-50 p-4"
            >
              <p className="text-sm font-bold text-amber-950">{notice.topic}</p>
              <p className="mt-1 text-sm text-amber-950">
                What you have written mentions this. If that is what your situation is,{" "}
                <strong>this part of the site does not cover it yet</strong> — and you should not
                rely on the draft below for it.
              </p>
              <p className="mt-2 text-sm text-amber-950">{notice.whatItIs}</p>
              <p className="mt-2 text-sm text-amber-950">{notice.whyNotCoveredHere}</p>
              <p className="mt-2 text-xs text-amber-900">
                <a className="underline" href={notice.sourceUrl} target="_blank" rel="noreferrer">
                  {notice.pinpoint}
                </a>
              </p>
            </section>
          ))}
        </div>
      )}

      {/* ---- The draft ---- */}
      <div className="mt-6">
        <button
          type="button"
          data-testid="cs-build-draft"
          onClick={() => setShowDraft(true)}
          className="rounded-full bg-[#2f7d67] px-5 py-3 text-sm font-bold text-white"
        >
          Build the application draft
        </button>
        <p className={HELP}>
          Nothing is withheld if answers are missing. Anything not recorded appears in the draft as
          not recorded, rather than the draft refusing to appear.
        </p>
      </div>

      {showDraft && (
        <section data-testid="cs-draft" className="mt-4 rounded-2xl border border-[#d8e6df] bg-white p-5">
          <p className="text-sm font-bold text-[#10231f]">{draft.applicationForm}</p>
          <p className="text-sm text-[#4f685f]" data-testid="cs-draft-financial-statement">
            Financial statement: {draft.financialStatementForm}
          </p>
          {draft.placeholders.length > 0 && (
            <div data-testid="cs-draft-placeholders" className="mt-3 rounded-xl bg-[#f8fcfa] p-3">
              <p className="text-sm font-semibold text-[#10231f]">Still to fill in</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-[#4f685f]">
                {draft.placeholders.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          <pre
            data-testid="cs-draft-text"
            className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-[#f8fcfa] p-4 text-xs text-[#10231f]"
          >
            {draft.draftText}
          </pre>
          <p className="mt-2 text-xs text-[#4f685f]">
            Source:{" "}
            <a className="underline" href={ONTARIO_GUIDELINES_URL}>
              O. Reg. 391/97
            </a>
          </p>
        </section>
      )}
    </section>
  );
}
