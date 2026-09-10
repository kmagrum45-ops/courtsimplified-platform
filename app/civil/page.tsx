import Link from "next/link";

import { ONTARIO_SMALL_CLAIMS_LIMIT } from "@/src/lib/case-system/utils";
import { ScalesIcon } from "../_components/CourtTypeIcons";

const civilAreas = [
  {
    title: "Negligence and harm",
    description:
      "Injury, unsafe conduct, institutional failure, professional negligence, property damage, unsafe premises, public safety failures, or loss caused by another person, business, professional, or institution.",
  },
  {
    title: "Contracts and money disputes",
    description:
      "Broken agreements, unpaid invoices, construction disputes, service problems, loans, business disputes, consumer issues, and financial losses.",
  },
  {
    title: "Human Rights and discrimination",
    description:
      "Disability, race, sex, family status, accommodation, employment, housing, services, education, and tribunal-related issues.",
  },
  {
    title: "Charter and government action",
    description:
      "Police, Crown, government bodies, public institutions, procedural unfairness, state-caused harm, equality, security of the person, and abuse of authority.",
  },
  {
    title: "Defamation and reputation",
    description:
      "False statements, reputational harm, online posts, workplace rumours, family conflict spillover, public accusations, and business damage.",
  },
  {
    title: "Privacy, records, and digital evidence",
    description:
      "Improper disclosure, misuse of personal information, institutional records, surveillance, access requests, screenshots, messages, metadata, and digital proof.",
  },
];

const civilSteps = [
  "Start with a guided intake that captures the parties, facts, timeline, damages, and evidence.",
  "Review a structured case summary that separates facts, proof, missing information, risks, and next procedural steps.",
  "Move into documents and forms with the civil path carried forward.",
  "Organize evidence, records, correspondence, and exhibits under the same case workflow.",
];

const civilResources: [string, string][] = [
  ["Civil claims: suing and being sued", "https://www.ontario.ca/page/civil-claims-suing-and-being-sued"],
  ["Steps to a Civil Case", "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/"],
  ["Rules of Civil Procedure", "https://www.ontario.ca/laws/regulation/900194"],
  ["Rules of Civil Procedure forms", "https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/"],
];

export default function CivilPage() {
  return (
    <main className="min-h-screen bg-[#f8faf8] text-[#16302b]">
      <section className="border-b border-[#d9e6df] bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#2f7d67]">
            Civil Court
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#10231f] md:text-5xl">
            Civil Court
          </h1>

          <p className="mt-6 text-lg leading-8 text-[#4d675f]">
            Civil Court (the Superior Court of Justice) handles negligence,
            contract, human-rights, defamation, and other civil claims that
            fall outside Small Claims Court&apos;s limit or scope.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/builder?path=civil"
              className="rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#256b58]"
            >
              Start my Civil case
            </Link>

            <Link
              href="/forms?path=civil"
              className="rounded-full border border-[#2f7d67] bg-white px-6 py-3 text-sm font-semibold text-[#2f7d67] transition hover:bg-[#eef8f5]"
            >
              Browse Civil Forms
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
              Above the Small Claims Court limit
            </h2>
            <p className="mt-3 text-base leading-7 text-[#33584d]">
              Small Claims Court can decide claims for money or the return of
              personal property up to $
              {ONTARIO_SMALL_CLAIMS_LIMIT.toLocaleString()}. Civil claims in
              the Superior Court of Justice generally involve amounts above
              that limit, or remedies — like an injunction — that Small
              Claims Court cannot grant at all.
            </p>
            <p className="mt-3 text-sm leading-6 text-[#557168]">
              If your claim is for money or property within the Small Claims
              limit, review the Small Claims Court path before starting here.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-[#10231f]">
            What civil court may involve
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#557168]">
            Civil litigation can involve court claims, institutional failure,
            damages, government conduct, rights-based issues, reputation
            harm, and evidence-heavy disputes.
          </p>
        </div>

        <ul className="space-y-3">
          {civilAreas.map((area) => (
            <li
              key={area.title}
              className="flex items-start gap-4 rounded-2xl border border-[#d8e6df] bg-white px-5 py-4 shadow-sm"
            >
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf7f3] text-[#2f7d67]">
                <ScalesIcon className="h-5 w-5" />
              </span>

              <div>
                <h3 className="text-lg font-semibold text-[#10231f]">
                  {area.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#5a736a]">
                  {area.description}
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
            Your civil case should stay connected from intake through case
            analysis, evidence, forms, document workspace, strategy, court
            package, and export.
          </p>

          <div className="mt-8 space-y-4">
            {civilSteps.map((point, index) => (
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
              href="/builder?path=civil"
              className="inline-block rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#256b58]"
            >
              Continue to Civil Intake →
            </Link>

            <Link
              href="/document-workspace?path=civil"
              className="inline-block rounded-full border border-[#bdd4ca] bg-white px-6 py-3 text-sm font-semibold text-[#1c473d] transition hover:border-[#2f7d67] hover:text-[#2f7d67]"
            >
              Go to Civil Documents →
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
            aria-label="Official Ontario Civil Court resources"
          >
            {civilResources.map(([label, href]) => (
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
