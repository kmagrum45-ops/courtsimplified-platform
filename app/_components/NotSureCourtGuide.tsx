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
  const ready = province === "Ontario" && city.trim() && facts.trim() && relationship.trim() && remedy.trim() && started;
  const family = /family|parent|spouse|partner|relative|child/i.test(relationship);
  const money = /money|payment|damages|refund|debt|cost/i.test(remedy) && amount.trim();
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
    sessionStorage.setItem(
      COURT_PATH_FINDER_KEY,
      JSON.stringify({ province, city: city.trim(), facts: facts.trim() }),
    );
    router.push(`/builder?path=${path}`);
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
        <div className="col-span-full rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
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
                aria-label="Guide province or territory"
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
                aria-label="Guide city or municipality"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded border p-2"
              />
            </label>
          </div>

          <label className="mt-4 block">
            What happened
            <textarea
              aria-label="Guide what happened"
              value={facts}
              onChange={(e) => setFacts(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            />
          </label>

          <label className="mt-4 block">
            Relationship between the people or businesses
            <input
              aria-label="Guide relationship"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            />
          </label>

          <label className="mt-4 block">
            What outcome or remedy is sought
            <input
              aria-label="Guide remedy"
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
              aria-label="Guide case started"
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

          {ready ? (
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
                        ? "Small Claims may be a path to review because you selected a money remedy and entered an amount. Confirm the court and procedure before filing."
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
        </div>
      ) : null}
    </>
  );
}
