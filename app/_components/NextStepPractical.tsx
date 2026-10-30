import { officialFormFor } from "@/src/lib/content-library/forms/officialFormLink";
import { CARD_TEXT, FEES_IF_CLAIMED_LABEL, SOURCE_SAVED_ON, practicalFor, type PlainLine, type PracticalCourt } from "@/src/lib/content-library/nextStepPractical";
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

const ONLY_WHILE_TIME_RUNS = new Set(["civil-18B"]);
/** The fee for filing that notice goes with it. */
const FEES_ONLY_WHILE_TIME_RUNS = new Set(["civ-intent"]);

export default function NextStepPractical({
  stepId,
  court,
  city = "",
  responding = false,
  story = "",
  noticeStepId = "",
  deadline = "",
  serveBy = "",
  divisionalOnly = false,
  today = "",
  timeRanOut = false,
}: {
  stepId: string;
  court: string;
  city?: string;
  responding?: boolean;
  /** The person's own words, used only to narrow a step's notice rules to the ones that fit. */
  story?: string;
  /** The written-notice step the case's claim points to (a municipal one keeps the municipal service line). */
  noticeStepId?: string;
  /** The step's counted last day and Ontario's today: a deadline too close to file online, and mail timing (walkthrough run 38525903567, SD). */
  deadline?: string;
  /** The person's own serving deadline, for the mail timing (personDeadlineOf). */
  serveBy?: string;
  /** The filing deadline is an appeal step the guide covers only in the Divisional Court. */
  divisionalOnly?: boolean;
  today?: string;
  /** The step's own counted time has passed (whenTimeRunsOut): forms that can only be used inside that time are not listed. */
  timeRanOut?: boolean;
}) {
  if (court !== "small-claims" && court !== "civil" && court !== "family") return null;
  const found = practicalFor(stepId, court as PracticalCourt, city, responding, story, noticeStepId, { deadline, serveBy, today, divisionalOnly });
  if (!found) return null;
  // Form 18B, the notice of intent to defend, is delivered "within the time for delivering a
  // statement of defence" (r. 18.02 (1), as the step's own content quotes it): once that time
  // has passed, it is not offered (item 12, case 11).
  const view = timeRanOut ? { ...found, forms: found.forms.filter((form) => !ONLY_WHILE_TIME_RUNS.has(`${form.court}-${form.number}`)), fees: found.fees.filter((fee) => !FEES_ONLY_WHILE_TIME_RUNS.has(fee.id)) } : found;
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
                  {form.note ? (
                    // The rule's condition for this form, beside it (Form 13 on a
                    // responding step, r. 13 (1) (b); legal review 2026-10-14).
                    <span data-testid="next-step-form-note" className="block text-[#4d675f]">
                      {form.note.say}
                      <Source cite={form.note.cite} />
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {view.formsIfClaimed.length > 0 ? (
            // Forms a rule needs only with a claim the person's words do not
            // name (2026-10-13: a parenting-only respondent was shown the
            // support financial statement as his form). Folded, with the rule.
            <details data-testid="next-step-forms-if-claimed" className="mt-2">
              <summary className="cursor-pointer font-semibold text-[#2f7d67]">
                {CARD_TEXT.formsIfClaimed} ({view.formsIfClaimed.length})
              </summary>
              <ul className="mt-1 space-y-1">
                {view.formsIfClaimed.map((form) => {
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
                      <span className="block text-[#4d675f]">{form.when.say}</span>
                      <Source cite={form.when.cite} />
                    </li>
                  );
                })}
              </ul>
            </details>
          ) : null}
          <p className="text-xs text-[#4d675f]">{CARD_TEXT.formsSource}</p>
        </div>
      ) : null}

      {/* A step with no fee of its own says so (2026-10-13: a motion to change
          showed no "What it costs" at all, because only a fee opened it). */}
      {view.fees.length > 0 || view.feeNotes.length > 0 ? (
        <div data-testid="next-step-fee">
          <p className="font-semibold">What it costs</p>
          <ul className="mt-1 space-y-1">
            {view.feeNotesFirst ? view.feeNotes.map((line) => <Line key={line.cite.pinpoint + line.say} line={line} />) : null}
            {view.fees.map((fee) => (
              <li key={fee.id}>
                {fee.label}: <span className="font-semibold">${fee.amount}</span>
                <Source cite={fee.cite} />
              </li>
            ))}
            {view.feeNotesFirst ? null : view.feeNotes.map((line) => <Line key={line.cite.pinpoint + line.say} line={line} />)}
            {view.feeWaiver ? <Line line={view.feeWaiver} /> : null}
          </ul>
          {view.feesIfClaimed ? (
            // Parenting-only words: the no-fee rule above leads, and the
            // amounts wait under their condition (walkthrough run 38525903567, FR).
            <details data-testid="next-step-fees-if-claimed" className="mt-2">
              <summary className="cursor-pointer font-semibold text-[#2f7d67]">{FEES_IF_CLAIMED_LABEL}</summary>
              <ul className="mt-1 space-y-1">
                {view.feesIfClaimed.fees.map((fee) => (
                  <li key={fee.id}>
                    {fee.label}: <span className="font-semibold">${fee.amount}</span>
                    <Source cite={fee.cite} />
                  </li>
                ))}
                {view.feesIfClaimed.notes.map((line) => (
                  <Line key={line.cite.pinpoint + line.say} line={line} />
                ))}
                {view.feesIfClaimed.waiver ? <Line line={view.feesIfClaimed.waiver} /> : null}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      {view.filing.length > 0 ? (
        <div data-testid="next-step-filing">
          <p className="font-semibold">Where and how to file</p>
          <ul className="mt-1 space-y-1">
            {view.filing.map((line) => (
              <Line key={line.say} line={line} />
            ))}
            {view.courtOffices?.place.map((line) => (
              <Line key={line.say} line={line} />
            ))}
          </ul>
          {view.courtOffices && view.courtOffices.offices.length > 0 ? (
            // The court offices in the person's city (2026-10-13: two family
            // cases were never told where their court is; 2026-10-14: the
            // same was true for Small Claims and civil, where the
            // courthouse data was already there -- see nextStepPractical.ts,
            // civilCourtOfficesFor).
            <div data-testid="next-step-court-office" className="mt-2">
              <p>
                If your case is in {view.courtOffices.city}, the {court === "family" ? "family" : court === "small-claims" ? "Small Claims" : "civil"}{" "}
                court office{view.courtOffices.offices.length > 1 ? "s" : ""} there {view.courtOffices.offices.length > 1 ? "are" : "is"}:
              </p>
              <ul className="mt-1 space-y-1">
                {view.courtOffices.offices.map((office) => (
                  <li key={office.name}>
                    <a href={office.url} target="_blank" rel="noreferrer" className="font-semibold underline">
                      {office.name}
                    </a>{" "}
                    ({office.court}){office.address.length ? `, ${office.address.join(", ")}` : ""}
                    {office.emails.length ? <span className="block text-xs text-[#4d675f]">{office.emails.join(" · ")}</span> : null}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-[#4d675f]">
                From the courts&apos; own location pages, read {view.courtOffices.source.readOn}. {CARD_TEXT.officesSource}{" "}
                <a href={`/courthouses?court=${court}`} className="underline">
                  All courthouses
                </a>
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {view.garnishee ? (
        // An employer named only vaguely (walkthrough run 38525903567, SJ):
        // what the rules say about naming the garnishee, and the examination
        // that is their way to find out more. Options the rules give, side by side.
        <div data-testid="next-step-garnishee">
          <p className="font-semibold">Naming the employer</p>
          <p className="mt-1">
            You wrote: “{view.garnishee.quote}” {CARD_TEXT.garnisheeChoice}
          </p>
          <ul className="mt-1 space-y-1">
            {view.garnishee.lines.map((line) => (
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

      {view.noticeHow.length > 0 ? (
        // What the notice must say and who gets it (2026-10-13, walkthrough:
        // a Toronto sidewalk fall had no help writing the notice to the City).
        <div data-testid="next-step-notice-how">
          <p className="font-semibold">How to give the notice</p>
          <ul className="mt-1 space-y-1">
            {view.noticeHow.map((line) => (
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

      {view.afterNotice.length > 0 ? (
        // After the notice, never before it: the form that starts the court
        // case, and its fee (walkthrough run 38500825561, SW: the notice card
        // never named the later claim form).
        <div data-testid="next-step-after-notice">
          <p className="font-semibold">Then, starting the court case</p>
          <ul className="mt-1 space-y-1">
            {view.afterNotice.map((line) => (
              <Line key={line.say} line={line} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
