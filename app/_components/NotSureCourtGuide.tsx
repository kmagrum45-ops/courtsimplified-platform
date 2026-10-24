"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CompassQuestionIcon } from "./CourtTypeIcons";
import { COURT_PATH_FINDER_KEY } from "../../src/lib/case-system/storage/intakeStorageKeys";
import { resetIntakeInBrowser } from "../../src/lib/case-system/storage/resetIntake";

type Path = "family" | "small-claims" | "civil";

export default function NotSureCourtGuide() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [facts, setFacts] = useState("");
  const [relationship, setRelationship] = useState("");
  const [remedy, setRemedy] = useState("");
  const [amount, setAmount] = useState("");
  const [started, setStarted] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [handoffError, setHandoffError] = useState("");
  const missing = Object.entries({ province: province === "Ontario", city: city.trim(), facts: facts.trim(), relationship: relationship.trim(), remedy: remedy.trim(), started }).filter(([,value]) => !value).map(([key]) => key);
  const fieldNames: Record<string,string> = { province: "Province or territory", city: "City or municipality", facts: "What happened", relationship: "Relationship", remedy: "Outcome or remedy", started: "Has a case already started?" };
  const ready = province === "Ontario" && city.trim() && facts.trim() && relationship.trim() && remedy.trim() && started;
  const family = /family|parent|spouse|partner|relative|child/i.test(relationship);
  // Any amount of money asked for, or a money remedy in their words, makes Small Claims a path
  // to review (finding 6: a $35,000 claim was offered Civil only). Never chosen for them.
  const money = Boolean(amount.trim()) || /money|pay|paid|owe|damages|refund|deposit|debt|cost|\$/i.test(remedy);
  const paths: Path[] = Array.from(new Set([...(family ? ["family" as const] : []), ...(money ? ["small-claims" as const] : []), "civil" as const]));
  /**
   * Opening the finder starts a new flow, so anything a previous visitor left
   * in this browser goes now — before a single field is typed.
   *
   * `includeUserScoped: false` because this component does not know whether
   * anyone is signed in, and wiping a signed-in user's saved draft from here
   * would be the mirror-image bug. Everything anonymous and everything
   * unscoped is still cleared, which is the shared-computer exposure.
   */
  function toggleOpen() {
    setOpen((value) => {
      if (!value) resetIntakeInBrowser({ includeUserScoped: false });
      return !value;
    });
  }

  function choose(path: Path) {
    /*
     * Only the three fields the builder actually reads are handed over.
     *
     * This used to write seven — relationship, remedy, amount and started as
     * well — none of which anything ever read. They sat in sessionStorage for
     * the life of the tab describing the user's situation, for no purpose.
     * Storing what nothing consumes is storing it for the next person.
     */
    try { sessionStorage.setItem(
      COURT_PATH_FINDER_KEY,
      // "Has a case already started?" is the situation questions' first answer (step 2): handed over, not asked again.
      JSON.stringify({ province, city: city.trim(), facts: facts.trim(), ...(started ? { started } : {}) }),
    );
    router.push(`/builder?path=${path}`);
    } catch { setHandoffError("This tab could not transfer your answers. Your text is still here. Please retry before leaving."); }
  }
  return (
    <>
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="group flex h-full w-full flex-col rounded-3xl border border-[#d8e6df] bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#2f7d67] hover:shadow-md"
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf7f3] text-[#2f7d67]">
          <CompassQuestionIcon className="h-6 w-6" />
        </span>

        <span className="mt-4 text-xl font-bold text-[#10231f]">
          Not sure which one?
        </span>

        <span className="mt-2 text-sm leading-6 text-[#557168]">
          Answer a few quick questions and we&apos;ll point you to the paths
          worth reviewing.
        </span>
      </button>

      {open ? (
        <form noValidate className="col-span-full rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm" onChange={() => setSubmitted(false)} onSubmit={event => { event.preventDefault(); setAttempted(true); setSubmitted(Boolean(ready)); if (!ready) requestAnimationFrame(() => document.getElementById("finder-errors")?.focus()); }}>
          <h2 className="text-2xl font-bold text-[#10231f]">
            Find possible court paths to review
          </h2>
          <p className="mt-2 text-sm text-[#4d675f]">
            This guide does not decide the correct court or create a case.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label>
              Province or territory
              <select
                aria-label="Guide province or territory" id="finder-province" aria-invalid={attempted && missing.includes("province")} aria-describedby={attempted && missing.includes("province") ? "finder-errors" : undefined}
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="mt-1 w-full rounded border p-2"
              >
                <option value="">Select</option>
                <option value="Ontario">Ontario</option>
              </select>
            </label>
            <label>
              City or municipality
              <input
                aria-label="Guide city or municipality" id="finder-city" aria-invalid={attempted && missing.includes("city")} aria-describedby={attempted && missing.includes("city") ? "finder-errors" : undefined}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded border p-2"
              />
            </label>
          </div>

          <label className="mt-4 block">
            What happened
            <textarea
              aria-label="Guide what happened" id="finder-facts" aria-invalid={attempted && missing.includes("facts")} aria-describedby={attempted && missing.includes("facts") ? "finder-errors" : undefined}
              value={facts}
              onChange={(e) => setFacts(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            />
          </label>

          <label className="mt-4 block">
            Relationship between the people or businesses
            <input
              aria-label="Guide relationship" id="finder-relationship" aria-invalid={attempted && missing.includes("relationship")} aria-describedby={attempted && missing.includes("relationship") ? "finder-errors" : undefined}
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            />
          </label>

          <label className="mt-4 block">
            What outcome or remedy is sought
            <input
              aria-label="Guide remedy" id="finder-remedy" aria-invalid={attempted && missing.includes("remedy")} aria-describedby={attempted && missing.includes("remedy") ? "finder-errors" : undefined}
              value={remedy}
              onChange={(e) => setRemedy(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            />
          </label>

          <label className="mt-4 block">
            Amount, if money is requested
            <input
              aria-label="Guide amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            />
          </label>

          <label className="mt-4 block">
            Has a case already started?
            <select
              aria-label="Guide case started" id="finder-started" aria-invalid={attempted && missing.includes("started")} aria-describedby={attempted && missing.includes("started") ? "finder-errors" : undefined}
              value={started}
              onChange={(e) => setStarted(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="not-sure">Not sure</option>
            </select>
          </label>

          <button type="submit" className="mt-5 rounded bg-[#2f7d67] px-5 py-3 font-semibold text-white">Review possible court paths</button>
          {attempted && missing.length > 0 && <div id="finder-errors" role="alert" tabIndex={-1} className="mt-4 rounded border border-amber-400 p-4"><p>Please answer the following before continuing:</p><ul>{missing.map(key => <li key={key}><a className="underline" href={`#finder-${key}`}>{fieldNames[key]}</a></li>)}</ul></div>}
          {handoffError && <p role="alert">{handoffError}</p>}
          {submitted && ready ? (
            <div className="mt-6">
              <h3 className="text-lg font-bold">
                Possible court paths to review
              </h3>
              {paths.map((path) => (
                <div key={path} className="mt-3 rounded-xl border p-4">
                  <p>
                    {path === "family"
                      ? "Family may be a path to review because the information concerns a family relationship."
                      : path === "small-claims"
                        ? "Small Claims may be a path to review because you are asking for money. Confirm the court and procedure before filing."
                        : "Civil may be a path to review where the matter does not fit the other available paths."}
                  </p>
                  <button
                    type="button"
                    onClick={() => choose(path)}
                    className="mt-3 font-semibold text-[#2f7d67]"
                  >
                    Choose{" "}
                    {path === "small-claims"
                      ? "Small Claims"
                      : path[0].toUpperCase() + path.slice(1)}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </form>
      ) : null}
    </>
  );
}
