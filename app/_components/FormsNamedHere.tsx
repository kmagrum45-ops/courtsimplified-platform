import { officialFormsNamedIn, relevantToFamilyCase } from "@/src/lib/content-library/forms/formsInText";

/**
 * "Forms named in this step": the official forms the guidance above names,
 * each with its official PDF and Word links. Renders nothing when the
 * guidance names none. See src/lib/content-library/forms/formsInText.ts.
 */
export default function FormsNamedHere({
  texts,
  court,
  heading = "Forms named in this step",
  userWords = "",
}: {
  texts: readonly string[];
  court: string;
  heading?: string;
  /** The user's own story and answers, so a family case lists only the forms for its kind of case. */
  userWords?: string;
}) {
  const forms = officialFormsNamedIn(texts, court).filter(
    (form) => court !== "family" || relevantToFamilyCase(form, userWords),
  );
  if (forms.length === 0) return null;
  return (
    <div data-testid="forms-named-here" className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
      <p className="text-sm font-semibold text-[#16302b]">{heading}</p>
      <ul className="mt-2 space-y-2">
        {forms.map((form) => (
          <li key={form.number} className="text-sm text-[#24463d]">
            <span className="font-semibold">Form {form.number}</span> — {form.title}
            <span className="ml-2 inline-flex flex-wrap gap-2">
              {form.pdf ? (
                <a href={form.pdf} target="_blank" rel="noreferrer" className="font-semibold text-[#2f7d67] underline">
                  Official PDF
                </a>
              ) : null}
              {form.docx ? (
                <a href={form.docx} target="_blank" rel="noreferrer" className="font-semibold text-[#2f7d67] underline">
                  Word
                </a>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-[#4d675f]">
        From the official Ontario Court Forms site. Check the version date there before you file.
      </p>
    </div>
  );
}
