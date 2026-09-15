/**
 * How the child support table works — as a structure, never as a calculation.
 *
 * WHY THIS IS A CARD AND NOT A CALCULATOR. The draft engine deliberately
 * carries no support amount, for reasons set out at length in
 * family/childSupportDraftEngine.ts. A user who reads that draft and finds no
 * figure will go looking for one, and the honest answer is not silence — it is
 * to show them what the table actually is, so they can read it themselves at
 * the source and see why it is not a number this site can produce.
 *
 * *** STRUCTURE, NOT A WORKED EXAMPLE ***
 *
 * There are no numbers in this card. Not a sample income, not a sample band,
 * not a "for example, an income of $X in Ontario with one child". A worked
 * example with plausible numbers reads as a calculation whatever the caption
 * above it says, and the caption is not what a worried person remembers. The
 * column headings are shown empty, which is exactly the point being made: the
 * row is a formula, and the inputs are not ones this site holds.
 *
 * The amounts are not vendored either — see
 * docs/sources/federal-child-support-table-structure.txt, which records the
 * shape and deliberately omits the figures for the same reason.
 *
 * *** WHICH TABLE, AND THE TRAP THAT REPLACED THE TWO-TABLE TRAP ***
 *
 * Until 2026-09-14 this codebase asserted in six places that Ontario and the
 * federal government each publish a table. That was wrong: O. Reg. 303/24
 * revoked Schedule I of O. Reg. 391/97 and rewrote s. 2 (1) to point at the
 * federal table. See docs/OUTSTANDING_ISSUES.md section 0.
 *
 * The live question is not which path but WHERE THE PAYOR LIVES. s. 2 (1)
 * selects the table for the province where the parent or spouse against whom
 * the order is sought ordinarily resides. A user in Ontario whose payor lives
 * in Alberta needs the Alberta table, and under the old framing this site
 * would have pointed them at the wrong one. That is why the definition is
 * quoted here rather than summarised.
 *
 * WHAT THIS CARD MUST NOT DO. It must not take the user's income, must not
 * name a band, must not say which province's table applies to them, and must
 * not say what they would receive or owe. It quotes the rule; the user applies
 * it — the "who does the applying" test in CLAUDE.md section 2.
 */

import {
  CHILD_SUPPORT_VERIFIED_AT,
  FEDERAL_GUIDELINES_URL,
  ONTARIO_GUIDELINES_URL,
} from "../../../src/lib/case-system/family/childSupportFlaPath";

const FEDERAL_TABLE_URL =
  "https://laws-lois.justice.gc.ca/eng/regulations/SOR-97-175/page-5.html";

/** The column structure, retrieved and read from the source above. Empty by design. */
const TABLE_COLUMNS = [
  { group: "Income ($)", columns: ["From", "To"] },
  { group: "Monthly Award ($)", columns: ["Basic Amount", "Plus (%)", "Of Income Over"] },
];

export function ChildSupportTableCard() {
  return (
    <section
      data-testid="child-support-table-card"
      className="mt-6 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[#4f685f]">
        How the table works
      </p>
      <h3 className="mt-1 text-lg font-bold text-[#10231f]">
        The child support table is a formula, not a figure to look up
      </h3>
      <p className="mt-2 text-sm text-[#4f685f]">
        This explains how the table is built. It is not about your case, and no amount is
        worked out here or anywhere else on this site.
      </p>

      {/* ---- What the rule says the amount is ---- */}
      <div className="mt-5 rounded-xl border border-[#d8e6df] bg-white p-4">
        <p className="text-sm font-bold text-[#10231f]">
          Child Support Guidelines, O. Reg. 391/97, s. 3 (1)
        </p>
        <blockquote className="mt-2 border-l-4 border-[#2f7d67] pl-4 text-sm text-[#10231f]">
          <p>
            Unless otherwise provided under these guidelines, the amount of an order for the
            support of a child for children under the age of majority is,
          </p>
          <p className="mt-2">
            (a) the amount set out in the applicable table, according to the number of children
            under the age of majority to whom the order relates and the income of the parent or
            spouse against whom the order is sought; and
          </p>
          <p className="mt-2">(b) the amount, if any, determined under section 7.</p>
        </blockquote>
        <p className="mt-3 text-sm text-[#4f685f]">
          Two parts, and only the first comes from the table. Section 7 covers special or
          extraordinary expenses, and the court decides those separately.
        </p>
      </div>

      {/* ---- Which table ---- */}
      <div className="mt-4 rounded-xl border border-[#d8e6df] bg-white p-4">
        <p className="text-sm font-bold text-[#10231f]">
          Which table — it depends on where the other parent lives
        </p>
        <p className="mt-2 text-sm text-[#4f685f]">
          Ontario does not publish a table of its own. O. Reg. 303/24 revoked the one it had,
          and s. 2 (1) of the Ontario Guidelines now defines &ldquo;table&rdquo; by pointing at
          the federal tables:
        </p>
        <blockquote className="mt-2 border-l-4 border-[#2f7d67] pl-4 text-sm text-[#10231f]">
          <p>&ldquo;table&rdquo; means,</p>
          <p className="mt-2">
            (a) if the parent or spouse against whom an order is sought ordinarily resides in
            Ontario at the time of the application, the table set out in the Federal Child
            Support Guidelines for Ontario,
          </p>
          <p className="mt-2">
            (b) if the parent or spouse against whom an order is sought ordinarily resides
            elsewhere in Canada, the table set out in the Federal Child Support Guidelines for
            the province or territory in which the parent or spouse ordinarily resides at the
            time of the application …
          </p>
        </blockquote>
        <p className="mt-3 text-sm text-[#4f685f]">
          It is where <strong>the person the order is sought against</strong> ordinarily
          resides — not where the case is filed, not where the child lives, not where you live.
          Paragraphs (c) and (d) go further: a court may use a different province&rsquo;s table
          where that residence has changed since the application, or will change in the near
          future.
        </p>
      </div>

      {/* ---- The structure. Empty, deliberately. ---- */}
      <div className="mt-4 rounded-xl border border-[#d8e6df] bg-white p-4">
        <p className="text-sm font-bold text-[#10231f]">What a table looks like</p>
        <p className="mt-2 text-sm text-[#4f685f]">
          Each table is headed by a province and a number of children, and carries two tiers of
          columns. The columns below are shown empty on purpose — the figures are at the source.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
            <thead>
              <tr>
                {TABLE_COLUMNS.map((tier) => (
                  <th
                    key={tier.group}
                    colSpan={tier.columns.length}
                    scope="colgroup"
                    className="border border-[#d8e6df] bg-[#eef6f2] px-3 py-2 font-bold text-[#10231f]"
                  >
                    {tier.group}
                  </th>
                ))}
              </tr>
              <tr>
                {TABLE_COLUMNS.flatMap((tier) =>
                  tier.columns.map((column) => (
                    <th
                      key={`${tier.group}-${column}`}
                      scope="col"
                      className="border border-[#d8e6df] bg-[#f8fcfa] px-3 py-2 font-semibold text-[#4f685f]"
                    >
                      {column}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              <tr>
                {TABLE_COLUMNS.flatMap((tier) =>
                  tier.columns.map((column) => (
                    <td
                      key={`row-${tier.group}-${column}`}
                      className="border border-[#d8e6df] px-3 py-3 text-[#96aca3]"
                    >
                      &mdash;
                    </td>
                  )),
                )}
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-sm text-[#4f685f]">
          A row&rsquo;s award is <strong>not</strong> the Basic Amount on its own. It is the
          Basic Amount <strong>plus</strong> the percentage in Plus (%) applied to the income
          above the &ldquo;Of Income Over&rdquo; figure, which is the floor of that row&rsquo;s
          band. That is what makes a row a calculation rather than an answer.
        </p>
      </div>

      {/* ---- Why the income that goes in is not the income you know ---- */}
      <div className="mt-4 rounded-xl border border-[#d8e6df] bg-white p-4">
        <p className="text-sm font-bold text-[#10231f]">
          The income the table takes is a defined figure
        </p>
        <p className="mt-2 text-sm text-[#4f685f]">
          It is not a salary and not a take-home figure. O. Reg. 391/97 s. 16 determines annual
          income using the sources listed under &ldquo;Total income&rdquo; in the T1 General
          form, <strong>adjusted in accordance with Schedule III</strong>. Sections 17 to 20 set
          out circumstances in which a court determines the figure differently again — a pattern
          of income over three years, income from a corporation, or an amount imputed to a
          parent or spouse.
        </p>
        <p className="mt-2 text-sm text-[#4f685f]">
          That is why this site records what you tell it about income and does not turn it into
          a support amount. The figure the table takes is one a court determines.
        </p>
      </div>

      <p className="mt-5 text-xs text-[#4f685f]">
        Sources, read in full at:{" "}
        <a className="underline" href={ONTARIO_GUIDELINES_URL}>
          O. Reg. 391/97 (Ontario)
        </a>
        {" · "}
        <a className="underline" href={FEDERAL_GUIDELINES_URL}>
          SOR/97-175 (federal)
        </a>
        {" · "}
        <a className="underline" href={FEDERAL_TABLE_URL}>
          the federal tables themselves
        </a>
        . Verified {CHILD_SUPPORT_VERIFIED_AT}.
      </p>
    </section>
  );
}
