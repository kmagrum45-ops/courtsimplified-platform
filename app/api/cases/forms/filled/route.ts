/**
 * POST /api/cases/forms/filled: the OFFICIAL form, its own boxes filled from the case record, as a PDF (site owner,
 * 14 Nov 2026, rules 3 and 4).
 *
 * In:  { caseId, form: "small-claims/7A" | "small-claims/1A", copy?: number (Form 1A: 1 for the first three parties
 *      after the first on each side, 2 for the next three, ...) }
 * Out: application/pdf, or { error }.
 *
 * The names, addresses, phone numbers and emails go into the form here, on the server, from the case record (read with
 * the person's own token: the ownership check and row-level security both apply), and only here: no model is called,
 * nothing is logged but the form's id. The official PDF is the court's own (docs/sources/forms/), filled with pdf.js
 * (forms/officialPdf.ts); the boxes come from the form's one map (forms/maps/).
 */
import { NextResponse } from "next/server";
import { FORM_COMPLETION_PAUSED, FORM_COMPLETION_PAUSED_MESSAGE } from "../../../../../src/lib/content-library/phaseScope";
import { UUID_PATTERN } from "../../../../../src/lib/case-system/events/caseEventRequest";
import { getAuthenticatedOwnedCase, getAuthenticatedUser } from "../../../../../src/lib/supabase/serverAuth";
import { intakeCourtOfRow } from "../../../../../src/lib/case-system/caseFile/factSave";
import { readCheckpoint } from "../../../../../src/lib/case-system/intakeCheckpoint";
import { formContextOf } from "../../../../../src/lib/case-system/forms/formContext";
import { FORM_MAPS } from "../../../../../src/lib/case-system/forms/maps";
import { additionalParties, form1ACopies } from "../../../../../src/lib/case-system/forms/maps/form1A";
import { filledFormPdf } from "../../../../../src/lib/case-system/forms/officialPdf";
import { UnprintableText, unprintableMessage } from "../../../../../src/lib/case-system/forms/attachedPages";

const FILE_NAMES: Record<string, string> = { "small-claims/7A": "Form-7A-Plaintiffs-Claim", "small-claims/1A": "Form-1A-Additional-Parties" };

export async function POST(request: Request) {
  if (FORM_COMPLETION_PAUSED) return NextResponse.json({ error: FORM_COMPLETION_PAUSED_MESSAGE }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = JSON.parse(await request.text()) as Record<string, unknown>; } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  if (!UUID_PATTERN.test(caseId)) return NextResponse.json({ error: "A valid selected case is required." }, { status: 400 });
  const map = FORM_MAPS.find((item) => item.id === body.form);
  if (!map) return NextResponse.json({ error: "That form is not one the site fills." }, { status: 400 });
  const copy = body.copy === undefined ? 1 : Number(body.copy);
  if (!Number.isInteger(copy) || copy < 1 || copy > 20) return NextResponse.json({ error: "Not a copy of this form." }, { status: 400 });

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to download the filled form." }, { status: 401 });
  const owned = await getAuthenticatedOwnedCase(request, user, caseId, { masterKeys: ["intakeCheckpoint", "intakeData"] });
  if (!owned) return NextResponse.json({ error: "The selected case could not be found." }, { status: 404 });
  const court = intakeCourtOfRow(owned);
  if (court !== map.court) return NextResponse.json({ error: "This form is not for this case's court." }, { status: 400 });
  const master = (owned.master_result ?? {}) as Record<string, unknown>;
  const ctx = formContextOf(readCheckpoint(master.intakeCheckpoint, court, caseId), master);

  let filledCtx = ctx;
  if (map.id === "small-claims/1A") {
    const copies = form1ACopies(additionalParties(ctx.plaintiffs, ctx.defendants));
    if (!copies[copy - 1]) return NextResponse.json({ error: "This case has no parties for that copy of Form 1A." }, { status: 404 });
    filledCtx = { ...ctx, additional: copies[copy - 1] };
  }
  try {
    // The form and, when the person's words overflowed its boxes, the attached pages (officialPdf.ts filledFormPdf).
    const bytes = await filledFormPdf(map, filledCtx);
    const name = `${FILE_NAMES[map.id] ?? map.id.replace(/\W+/g, "-")}${map.id === "small-claims/1A" ? `-${copy}` : ""}.pdf`;
    return new NextResponse(Buffer.from(bytes), { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } });
  } catch (error) {
    // Only the form's id and the error's kind: never a value from the case.
    console.error(`filled form failed: ${map.id}`, { errorName: error instanceof Error ? error.name : typeof error });
    // The person's words have a character the attached pages cannot print: say so, never change or drop it.
    if (error instanceof UnprintableText) return NextResponse.json({ error: unprintableMessage(error.characters) }, { status: 422 });
    return NextResponse.json({ error: "The filled form could not be made just now. Please try again." }, { status: 500 });
  }
}
