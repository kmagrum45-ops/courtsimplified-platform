"use client";

/**
 * FORM 7A AS THE SITE FILLS IT: EVERY BOX, FROM THE CASE RECORD (site owner, 14 Nov 2026, rules 4 and 5).
 *
 * Each box of the official form, in the form's order: what it holds from the record, or what is missing with a link to
 * the one place to add it, or why it is blank (the court office fills it, it is signed by hand, or the site has no
 * wording for it yet). Then "Download Form 7A (PDF)": the court's own PDF with its boxes filled, made on the server from
 * the saved record (POST /api/cases/forms/filled), and one Form 1A for each three parties after the first on a side.
 * Nothing here says "not entered" for something the person gave.
 *
 * States no law. No model.
 */
import { useState } from "react";
import { FORM_7A } from "../../src/lib/case-system/forms/maps/form7A";
import { additionalParties, form1ACopies } from "../../src/lib/case-system/forms/maps/form1A";
import { fillForm, type AddPlace, type BoxResult, type FormContext } from "../../src/lib/case-system/forms/formMap";
import { partyName } from "../../src/lib/case-system/parties/parties";
import { FILE_DOWNLOAD_FAILED, saveFile } from "../../src/lib/case-workspace/fileFetch";

const ADD_WORDS: Record<AddPlace, string> = { parties: "Add it in The parties", amount: "Add the amount", story: "Add it to your story" };

/** The box's own label, from the official PDF's name, made readable. */
const label = (box: string) => box.replace(/^Paintiff/, "Plaintiff").replace(/_continued$/, " (continued)");

export default function FilledForm7A({ ctx, caseId, addHref }: { ctx: FormContext; caseId: string | null; addHref: (place: AddPlace) => string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const results = fillForm(FORM_7A, ctx);
  const copies = form1ACopies(additionalParties(ctx.plaintiffs, ctx.defendants));
  const missing = results.filter((result) => result.state === "missing");

  async function download(form: string, copy: number, fallback: string) {
    if (!caseId || busy) return;
    setBusy(`${form}:${copy}`); setError("");
    try {
      const { supabase } = await import("../../src/lib/supabase/client");
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) { setError("Sign in to download the filled form."); return; }
      const response = await fetch("/api/cases/forms/filled", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ caseId, form, copy }) });
      if (!response.ok) { setError(((await response.json().catch(() => null)) as { error?: string } | null)?.error ?? FILE_DOWNLOAD_FAILED); return; }
      saveFile(await response.blob(), fallback);
    } catch {
      setError(FILE_DOWNLOAD_FAILED);
    } finally {
      setBusy(null);
    }
  }

  const row = (result: BoxResult) => (
    <li key={result.box} data-testid="form-box" data-box={result.box} data-state={result.state} className="text-sm">
      <span className="font-semibold">{label(result.box)}: </span>
      {result.state === "filled" ? <span data-testid="form-box-value">{typeof result.value === "boolean" ? (result.value ? "Ticked" : "Not ticked") : result.value}</span>
        : result.state === "missing" ? <span className="text-[#8a4b12]">Missing: {result.what}. <a data-testid="form-box-add" href={addHref(result.addAt)} className="font-semibold underline">{ADD_WORDS[result.addAt]}</a></span>
        : result.state === "not-given" ? <span className="text-[#4d675f]">Not given (only if you have it). <a href={addHref(result.addAt)} className="underline">{ADD_WORDS[result.addAt]}</a></span>
        : <span className="text-[#4d675f]">Left blank: {result.why}</span>}
    </li>
  );

  return (
    <section data-testid="filled-form-7a" className="space-y-3 rounded-xl border border-[#d8e6df] bg-white p-4">
      <h2 className="text-lg font-semibold text-[#16302b]">Form 7A, Plaintiff&apos;s Claim, filled from your case</h2>
      <p className="text-sm">{missing.length ? `${missing.length} box${missing.length === 1 ? "" : "es"} still need${missing.length === 1 ? "s" : ""} something from you (listed below).` : "Every box the site fills is filled from your case."}{" "}Check every box before you file it.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid="filled-form-7a-download" disabled={!caseId || busy !== null} onClick={() => void download("small-claims/7A", 1, "Form-7A-Plaintiffs-Claim.pdf")} className="rounded-full bg-[#2f7d67] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {busy === "small-claims/7A:1" ? "Making the PDF…" : "Download Form 7A (PDF)"}
        </button>
        {copies.map((copy, index) => (
          <button key={index} type="button" data-testid="filled-form-1a-download" disabled={!caseId || busy !== null} onClick={() => void download("small-claims/1A", index + 1, `Form-1A-Additional-Parties-${index + 1}.pdf`)} className="rounded-full border border-[#2f7d67] px-4 py-2 text-sm font-semibold text-[#2f7d67] disabled:opacity-60">
            {busy === `small-claims/1A:${index + 1}` ? "Making the PDF…" : `Download Form 1A${copies.length > 1 ? ` (${index + 1} of ${copies.length})` : ""}: ${copy.map((entry) => partyName(entry.party) || `${entry.side} ${entry.number}`).join(", ")}`}
          </button>
        ))}
      </div>
      {!caseId ? <p className="text-sm text-[#4d675f]">Save your case (sign in) to download the filled form.</p> : null}
      {error ? <p role="alert" className="text-sm text-[#8a4b12]">{error}</p> : null}
      <ul className="space-y-1">{results.map(row)}</ul>
    </section>
  );
}
