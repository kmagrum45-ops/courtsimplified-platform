"use client";

/**
 * A FORM AS THE SITE FILLS IT, FROM THE CASE RECORD: THE ONE PLACE A FILLED OFFICIAL FORM IS OFFERED (site owner, 14 and
 * 16 Nov 2026).
 *
 * Every form the site fills (forms/maps, FORM_MAPS) is offered here and only here: on the builder's Form 7A section
 * (FilledForm7A.tsx) and on the Forms tab (FormsWorkspace.tsx). "Download filled Form N (PDF)" is the court's own PDF with
 * its boxes filled, made on the server from the saved record (POST /api/cases/forms/filled), attached pages included
 * when the person's words overflow a box. Under it, each box: what it holds, or what is missing with a link to the one
 * place to add it, or why it is blank. Nothing here says "not entered" for something the person gave.
 *
 * The download never waits on a checklist or a kind of claim: Chrome, 16 Nov (row 24), found no filled Form 7A for an
 * injury, a contractor or a loan claim because the 7A section returned before it whenever the kind had no checklist.
 *
 * States no law. No model.
 */
import { useState } from "react";
import { WorkingButton } from "./Working";
import { useIntakeRecovery } from "./IntakeRecovery";
import { fillForm, type AddPlace, type BoxResult, type FormContext, type FormMapDefinition } from "../../src/lib/case-system/forms/formMap";
import { FILE_DOWNLOAD_FAILED, saveFile } from "../../src/lib/case-workspace/fileFetch";

const ADD_WORDS: Record<AddPlace, string> = { parties: "Add it in The parties", amount: "Add the amount", story: "Add it to your story" };

/** The box's own label, from the official PDF's name, made readable. */
const label = (box: string) => box.replace(/^Paintiff/, "Plaintiff").replace(/_continued$/, " (continued)");

/** The download's file name: the form's number and title, as the court names them. */
export const filledFileName = (map: Pick<FormMapDefinition, "number" | "title">, copy?: number) =>
  `Form-${map.number}-${map.title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")}${copy ? `-${copy}` : ""}.pdf`;

/** The button's words: always says the form comes filled, so it is never mistaken for the blank official form. */
export const filledButtonLabel = (map: Pick<FormMapDefinition, "number">) => `Download filled Form ${map.number} (PDF)`;

/** Download one filled form. Shared by every place that offers one. */
export function useFilledFormDownload(caseId: string | null) {
  const recovery = useIntakeRecovery();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function download(form: string, copy: number, fileName: string) {
    if (!caseId || busy) return;
    setBusy(`${form}:${copy}`); setError("");
    try {
      const { supabase } = await import("../../src/lib/supabase/client");
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) { setError("Sign in to download the filled form."); return; }
      // What was just typed is saved first: the form is filled from the saved case, and a save waits a moment after the
      // last change (IntakeRecovery begin -> flush). A detail typed and Download pressed straight away is in the form
      // (full local run of 3774a858: the parties typed a moment before were missing from the PDF, every box empty).
      await recovery?.begin();
      const response = await fetch("/api/cases/forms/filled", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ caseId, form, copy }) });
      if (!response.ok) { setError(((await response.json().catch(() => null)) as { error?: string } | null)?.error ?? FILE_DOWNLOAD_FAILED); return; }
      saveFile(await response.blob(), fileName);
    } catch {
      setError(FILE_DOWNLOAD_FAILED);
    } finally {
      setBusy(null);
    }
  }
  return { busy, error, download };
}

type Extra = { form: string; copy: number; label: string; fileName: string; testId: string };

export default function FilledForm({ map, ctx, caseId, addHref, extra = [], testId }: {
  map: FormMapDefinition;
  ctx: FormContext;
  caseId: string | null;
  addHref: (place: AddPlace) => string;
  /** More downloads that belong with this form (Form 1A copies with Form 7A). */
  extra?: readonly Extra[];
  testId?: string;
}) {
  const { busy, error, download } = useFilledFormDownload(caseId);
  const results = fillForm(map, ctx);
  const missing = results.filter((result) => result.state === "missing");

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
    <section data-testid={testId ?? "filled-form"} data-form={map.id} className="space-y-3 rounded-xl border border-[#d8e6df] bg-white p-4">
      <h2 className="text-lg font-semibold text-[#16302b]">Form {map.number}, {map.title}, filled from your case</h2>
      <p className="text-sm">{missing.length ? `${missing.length} box${missing.length === 1 ? "" : "es"} still need${missing.length === 1 ? "s" : ""} something from you (listed below).` : "Every box the site fills is filled from your case."}{" "}Check every box before you file it.</p>
      <div className="flex flex-wrap gap-2">
        {/* The site's own held button (Working.tsx): while the PDF is made it says so and is held (test:working-states). */}
        <WorkingButton type="button" data-testid="filled-form-download" data-form={map.id} disabled={!caseId || busy !== null} working={busy === `${map.id}:1`} workingLabel="Making the PDF…" onClick={() => void download(map.id, 1, filledFileName(map))} className="rounded-full bg-[#2f7d67] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {filledButtonLabel(map)}
        </WorkingButton>
        {extra.map((item) => (
          <WorkingButton key={`${item.form}:${item.copy}`} type="button" data-testid={item.testId} data-form={item.form} disabled={!caseId || busy !== null} working={busy === `${item.form}:${item.copy}`} workingLabel="Making the PDF…" onClick={() => void download(item.form, item.copy, item.fileName)} className="rounded-full border border-[#2f7d67] px-4 py-2 text-sm font-semibold text-[#2f7d67] disabled:opacity-60">
            {item.label}
          </WorkingButton>
        ))}
      </div>
      {!caseId ? <p className="text-sm text-[#4d675f]">Save your case (sign in) to download the filled form.</p> : null}
      {error ? <p role="alert" className="text-sm text-[#8a4b12]">{error}</p> : null}
      <ul className="space-y-1">{results.map(row)}</ul>
    </section>
  );
}
