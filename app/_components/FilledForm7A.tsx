"use client";

/**
 * FORM 7A AS THE SITE FILLS IT, WITH ONE FORM 1A FOR EACH THREE PARTIES AFTER THE FIRST ON A SIDE (site owner, 14 Nov 2026,
 * rules 4 and 5). The panel, the download and the box list are the one shared piece, FilledForm.tsx.
 *
 * States no law. No model.
 */
import FilledForm, { filledFileName } from "./FilledForm";
import { FORM_7A } from "../../src/lib/case-system/forms/maps/form7A";
import { FORM_1A, additionalParties, form1ACopies } from "../../src/lib/case-system/forms/maps/form1A";
import type { AddPlace, FormContext } from "../../src/lib/case-system/forms/formMap";
import { partyName } from "../../src/lib/case-system/parties/parties";

export default function FilledForm7A({ ctx, caseId, addHref }: { ctx: FormContext; caseId: string | null; addHref: (place: AddPlace) => string }) {
  const copies = form1ACopies(additionalParties(ctx.plaintiffs, ctx.defendants));
  const extra = copies.map((copy, index) => ({
    form: FORM_1A.id,
    copy: index + 1,
    fileName: filledFileName({ number: "1A", title: "Additional Parties" }, index + 1),
    testId: "filled-form-1a-download",
    label: `Download filled Form 1A${copies.length > 1 ? ` (${index + 1} of ${copies.length})` : ""}: ${copy.map((entry) => partyName(entry.party) || `${entry.side} ${entry.number}`).join(", ")}`,
  }));
  return <FilledForm map={FORM_7A} ctx={ctx} caseId={caseId} addHref={addHref} extra={extra} testId="filled-form-7a" />;
}
