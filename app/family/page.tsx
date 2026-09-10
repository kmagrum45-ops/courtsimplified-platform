import Link from "next/link";

import { FamilyIcon } from "../_components/CourtTypeIcons";

const familyTopics = [
  {
    title: "Parenting and decision-making",
    description:
      "Organize parenting schedules, decision-making responsibility, exchanges, communication issues, children's routines, safety concerns, and communication problems.",
  },
  {
    title: "Support and disclosure",
    description:
      "Track child support, spousal support, income, arrears, expenses, financial disclosure, and missing documents.",
  },
  {
    title: "Separation, divorce, and property",
    description:
      "Prepare facts about separation dates, agreements, property, debts, the home, requested orders, and unresolved issues.",
  },
  {
    title: "Adoption — review required",
    description:
      "A Family-law pathway that requires review of the current Ontario forms and court requirements. CourtSimplified does not automate or recommend an adoption filing here.",
  },
];

const familySteps = [
  "Start with a guided family intake so the case facts are captured once.",
  "Review a structured case summary showing issues, dates, missing information, and next steps.",
  "Move into documents and forms with the family path carried forward.",
  "Organize evidence, messages, screenshots, disclosure, and exhibits under the same case workflow.",
];

const familyResources: [string, string][] = [
  ["Guide to procedures in family court", "https://www.ontario.ca/document/guide-procedures-family-court"],
  ["Family Law Rules", "https://www.ontario.ca/laws/regulation/990114"],
  ["Official Family Law Rules forms", "https://ontariocourtforms.on.ca/en/family-law-rules-forms/"],
  ["Family court support workers", "https://www.ontario.ca/page/family-court-support-workers"],
  ["Connect with supports for survivors of violence", "https://www.ontario.ca/page/connect-supports-survivors-violence"],
];

export default function FamilyPage() {
  return (
    <main className="min-h-screen bg-[#f8faf8] text-[#16302b]">
      <section className="border-b border-[#d9e6df] bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#2f7d67]">
            Family Court
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#10231f] md:text-5xl">
            Family Court
          </h1>

          <p className="mt-6 text-lg leading-8 text-[#4f685f]">
            Family Court handles parenting, decision-making responsibility,
            child and spousal support, separation, divorce, and property
            matters between families.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/builder?path=family"
              className="rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#276a57]"
            >
              Start my Family case
            </Link>

            <Link
              href="/forms?path=family"
              className="rounded-full border border-[#2f7d67] bg-white px-6 py-3 text-sm font-semibold text-[#2f7d67] transition hover:bg-[#edf7f3]"
            >
              Browse Family Forms
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
              What Family Court covers
            </h2>
            <p className="mt-3 text-base leading-7 text-[#33584d]">
              Family Court hears matters about parenting time and
              decision-making responsibility, child and spousal support,
              separation and divorce, and the division of property between
              spouses. There is no monetary limit the way there is in Small
              Claims Court — what matters is the type of matter, not an
              amount.
            </p>
            <p className="mt-3 text-sm leading-6 text-[#557168]">
              If you or a child may be unsafe, safety comes first. If you are
              in immediate danger, call 911.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-[#10231f]">
            What family court may involve
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#557168]">
            Choose this path if your situation involves family relationships,
            children, support, separation, divorce, property, or family
            safety concerns.
          </p>
        </div>

        <ul className="space-y-3">
          {familyTopics.map((topic) => (
            <li
              key={topic.title}
              className="flex items-start gap-4 rounded-2xl border border-[#d8e6df] bg-white px-5 py-4 shadow-sm"
            >
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf7f3] text-[#2f7d67]">
                <FamilyIcon className="h-5 w-5" />
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
            Your family case should stay connected from intake through case
            analysis, documents, evidence, strategy, court package, and
            export.
          </p>

          <div className="mt-8 space-y-4">
            {familySteps.map((point, index) => (
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
              href="/builder?path=family"
              className="inline-block rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#276a57]"
            >
              Continue to Family Intake →
            </Link>

            <Link
              href="/document-workspace?path=family"
              className="inline-block rounded-full border border-[#bdd4ca] bg-white px-6 py-3 text-sm font-semibold text-[#1c473d] transition hover:border-[#2f7d67] hover:text-[#2f7d67]"
            >
              Go to Family Documents →
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
            aria-label="Official Ontario Family Court resources"
          >
            {familyResources.map(([label, href]) => (
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
