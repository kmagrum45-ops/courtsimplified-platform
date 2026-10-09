import { officialFormFor } from "@/src/lib/content-library/forms/officialFormLink";
import { SOURCE_SAVED_ON, practicalFor, type PlainLine, type PracticalCourt } from "@/src/lib/content-library/nextStepPractical";
import { officialUrl, sourceName, type RuleCitation } from "@/src/lib/case-system/stage-map/citations";

/**
 * The practical half of "Your next step": the form, what filing it costs,
 * where and how to file it, and how to serve it (master plan Phase 2,
 * 2026-10-08). Every line is a fixed fact from the rules, the fee regulations
 * or the ontario.ca filing pages, with its source, pinpoint and the date the
 * source was saved; the official words open underneath. Data and checks:
 * src/lib/content-library/nextStepPractical.ts, npm run test:next-step-practical.
 */

function Source({ cite }: { cite: RuleCitation }) {
  const saved = SOURCE_SAVED_ON[cite.sourceId];
  return (
    <details className="mt-1 text-xs leading-5 text-[#4d675f]">
      <summary className="cursor-pointer">
        <a href={officialUrl(cite)} target="_blank" rel="noreferrer" className="underline">
          {sourceName(cite)}
        </a>
        , {cite.pinpoint}
        {saved ? ` · checked ${saved}` : ""}
      </summary>
      <p className="mt-1 italic">“{cite.quote}”</p>
    </details>
  );
}

function Line({ line }: { line: PlainLine }) {
  return (
    <li>
      {line.say}
      <Source cite={line.cite} />
    </li>
  );
}

export default function NextStepPractical({ stepId, court, city = "" }: { stepId: string; court: string; city?: string }) {
  if (court !== "small-claims" && court !== "civil" && court !== "family") return null;
  const view = practicalFor(stepId, court as PracticalCourt, city);
  if (!view) return null;
  return (
    <div data-testid="next-step-practical" className="mt-3 space-y-3 text-sm leading-6 text-[#16302b]">
      {view.forms.length > 0 ? (
        <div data-testid="next-step-forms">
          <p className="font-semibold">The form{view.forms.length > 1 ? "s" : ""}</p>
          <ul className="mt-1 space-y-1">
            {view.forms.map((form) => {
              const official = officialFormFor(form.court, form.number);
              return (
                <li key={`${form.court}-${form.number}`}>
                  <span className="font-semibold">Form {form.number}</span>
                  {official ? ` — ${official.title}` : ""}
                  {official?.pdf ? (
                    <a href={official.pdf} target="_blank" rel="noreferrer" className="ml-2 font-semibold text-[#2f7d67] underline">
                      PDF
                    </a>
                  ) : null}
                  {official?.docx ? (
                    <a href={official.docx} target="_blank" rel="noreferrer" className="ml-2 font-semibold text-[#2f7d67] underline">
                      Word
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-[#4d675f]">From the official Ontario Court Forms site. Check the version date there before you file.</p>
        </div>
      ) : null}

      {view.fees.length > 0 ? (
        <div data-testid="next-step-fee">
          <p className="font-semibold">What it costs</p>
          <ul className="mt-1 space-y-1">
            {view.fees.map((fee) => (
              <li key={fee.id}>
                {fee.label}: <span className="font-semibold">${fee.amount}</span>
                <Source cite={fee.cite} />
              </li>
            ))}
            {view.feeNotes.map((line) => (
              <Line key={line.cite.pinpoint + line.say} line={line} />
            ))}
            {view.feeWaiver ? <Line line={view.feeWaiver} /> : null}
          </ul>
        </div>
      ) : null}

      {view.filing.length > 0 ? (
        <div data-testid="next-step-filing">
          <p className="font-semibold">Where and how to file</p>
          <ul className="mt-1 space-y-1">
            {view.filing.map((line) => (
              <Line key={line.say} line={line} />
            ))}
          </ul>
        </div>
      ) : null}

      {view.serving.length > 0 ? (
        <div data-testid="next-step-service">
          <p className="font-semibold">Serving it on the other side</p>
          <ul className="mt-1 space-y-1">
            {view.serving.map((line) => (
              <Line key={line.say} line={line} />
            ))}
          </ul>
        </div>
      ) : null}

      {view.also.length > 0 ? (
        <div data-testid="next-step-also">
          <p className="font-semibold">The rule for this step</p>
          <ul className="mt-1 space-y-1">
            {view.also.map((rule) => (
              <li key={rule.pinpoint}>
                <span className="italic">“{rule.quote}”</span>
                <span className="block text-xs text-[#4d675f]">
                  <a href={officialUrl(rule)} target="_blank" rel="noreferrer" className="underline">
                    {sourceName(rule)}
                  </a>
                  , {rule.pinpoint}
                  {SOURCE_SAVED_ON[rule.sourceId] ? ` · checked ${SOURCE_SAVED_ON[rule.sourceId]}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
