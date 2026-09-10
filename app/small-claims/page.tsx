import Link from "next/link";

import { ONTARIO_SMALL_CLAIMS_LIMIT } from "@/src/lib/case-system/utils";
import { CoinsIcon } from "../_components/CourtTypeIcons";

const smallClaimsTopics = [
  {
    title: "Money owed",
    description:
      "Organize unpaid invoices, loans, deposits, refunds, repair costs, arrears, and other money disputes.",
  },
  {
    title: "Contracts and agreements",
    description:
      "Prepare facts about written agreements, verbal agreements, missed payments, broken promises, poor work, and service disputes.",
  },
  {
    title: "Property and damage claims",
    description:
      "Keep photos, receipts, estimates, messages, timelines, and proof of loss together for property damage or recovery claims.",
  },
];

const smallClaimsSteps = [
  "Start with a guided intake that captures the claim, parties, dates, amount claimed, evidence, and what happened.",
  "Review a structured case summary that separates facts, proof, missing information, risks, and next procedural steps.",
  "Move into documents and forms with the small claims path carried forward.",
  "Organize evidence, messages, invoices, receipts, estimates, photos, and exhibits under the same case workflow.",
];

const smallClaimsResources: [string, string][] = [
  ["Suing someone in Small Claims Court", "https://www.ontario.ca/page/suing-someone-small-claims-court"],
  ["Being sued in Small Claims Court", "https://www.ontario.ca/page/being-sued-small-claims-court"],
  ["Guide to procedures in Small Claims Court", "https://www.ontario.ca/document/guide-procedures-small-claims-court"],
  ["Official Small Claims Court forms", "https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/"],
  ["Rules of the Small Claims Court", "https://www.ontario.ca/laws/regulation/980258"],
];

export default function SmallClaimsPage() {
  return (
    <main className="min-h-screen bg-[#f8faf8] text-[#16302b]">
      <section className="border-b border-[#d9e6df] bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#2f7d67]">
            Small Claims Court
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#10231f] md:text-5xl">
            Small Claims Court
          </h1>

          <p className="mt-6 text-lg leading-8 text-[#4f685f]">
            Small Claims Court handles money and property disputes — unpaid
            invoices, contracts, deposits, loans, and property damage — up to
            its monetary limit.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/builder?path=small-claims"
              className="rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#276a57]"
            >
              Start my Small Claims case
            </Link>

            <Link
              href="/forms?path=small-claims"
              className="rounded-full border border-[#2f7d67] bg-white px-6 py-3 text-sm font-semibold text-[#2f7d67] transition hover:bg-[#edf7f3]"
            >
              Browse Small Claims Forms
            </Link>

            <a
              href="#how-it-works"
              className="rounded-full border border-[#bdd4ca] bg-white px-6 py-3 text-sm font-semibold text-[#1c473d] transition hover:border-[#2f7d67] hover:text-[#2f7d67]"
            >
              How it works
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-[#d9e6df] bg-[#edf7f3]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="max-w-4xl rounded-3xl border border-[#9fcbb9] bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold tracking-tight text-[#10231f]">
              The Small Claims Court limit
            </h2>
            <p className="mt-3 text-base leading-7 text-[#33584d]">
              Small Claims Court can decide claims for money or the return of
              personal property up to $
              {ONTARIO_SMALL_CLAIMS_LIMIT.toLocaleString()}, excluding
              interest and costs.
            </p>
            <p className="mt-3 text-sm leading-6 text-[#557168]">
              If the amount is higher, review the Civil Court path before
              deciding where to proceed.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-[#10231f]">
            What small claims may involve
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#557168]">
            Choose this path if your dispute involves money, property, unpaid
            work, services, contracts, or civil claims that belong in Small
            Claims Court.
          </p>
        </div>

        <ul className="space-y-3">
          {smallClaimsTopics.map((topic) => (
            <li
              key={topic.title}
              className="flex items-start gap-4 rounded-2xl border border-[#d8e6df] bg-white px-5 py-4 shadow-sm"
            >
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf7f3] text-[#2f7d67]">
                <CoinsIcon className="h-5 w-5" />
              </span>

              <div>
                <h3 className="text-lg font-semibold text-[#10231f]">
                  {topic.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#5a736a]">
                  {topic.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="how-it-works" className="border-y border-[#d9e6df] bg-white scroll-mt-20">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-3xl font-bold tracking-tight text-[#10231f]">
            How this path connects
          </h2>

          <p className="mt-4 max-w-3xl text-base leading-7 text-[#557168]">
            Your small claims case should stay connected from intake through
            case analysis, evidence, forms, document workspace, strategy,
            court package, and export.
          </p>

          <div className="mt-8 space-y-4">
            {smallClaimsSteps.map((point, index) => (
              <div
                key={point}
                className="flex items-start gap-4 rounded-2xl border border-[#dbe8e2] bg-[#f8fbf9] px-5 py-4"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2f7d67] text-sm font-bold text-white">
                  {index + 1}
                </span>
                <p className="text-base font-medium text-[#15312b]">
                  {point}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/builder?path=small-claims"
              className="inline-block rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#276a57]"
            >
              Continue to Small Claims Intake →
            </Link>

            <Link
              href="/document-workspace?path=small-claims"
              className="inline-block rounded-full border border-[#bdd4ca] bg-white px-6 py-3 text-sm font-semibold text-[#1c473d] transition hover:border-[#2f7d67] hover:text-[#2f7d67]"
            >
              Go to Small Claims Documents →
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-[#d9e6df] bg-[#edf7f3]">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h2 className="text-3xl font-bold tracking-tight text-[#10231f]">
            Official Ontario resources
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#557168]">
            Published by the province and the courts. Always verify
            requirements here.
          </p>
          <ul
            className="mt-7 grid gap-3 md:grid-cols-2"
            aria-label="Official Ontario Small Claims Court resources"
          >
            {smallClaimsResources.map(([label, href]) => (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl border border-[#bdd4ca] bg-white px-5 py-4 text-sm font-semibold text-[#1c473d] transition hover:border-[#2f7d67] hover:text-[#2f7d67]"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
