import { Suspense } from "react";
import Link from "next/link";

import { ONTARIO_SMALL_CLAIMS_LIMIT } from "@/src/lib/case-system/utils";
import HomeLocationGate from "./_components/HomeLocationGate";
import NotSureCourtGuide from "./_components/NotSureCourtGuide";
import { CoinsIcon, FamilyIcon, ScalesIcon } from "./_components/CourtTypeIcons";

const courtPaths = [
  {
    title: "Small Claims",
    href: "/small-claims",
    description: `Money owed, contracts, property damage, and similar disputes up to $${ONTARIO_SMALL_CLAIMS_LIMIT.toLocaleString()}.`,
    Icon: CoinsIcon,
  },
  {
    title: "Family",
    href: "/family",
    description:
      "Parenting, support, separation, divorce, and property matters in family court.",
    Icon: FamilyIcon,
  },
  {
    title: "Civil",
    href: "/civil",
    description:
      "Negligence, contracts, human rights, and other civil claims outside the Small Claims limit.",
    Icon: ScalesIcon,
  },
];

const workflowSteps = [
  {
    title: "Choose your court path",
    text: "Start with Family, Small Claims, or Civil depending on your situation.",
  },
  {
    title: "Complete intelligent intake",
    text: "The platform helps organize facts, evidence, possible legal issues to review, procedural concerns, and the information still needed for the case.",
  },
  {
    title: "Build your case workspace",
    text: "Keep forms, evidence, drafting, timelines, and strategy connected to one organized case file.",
  },
  {
    title: "Prepare organized case materials",
    text: "Build structured documents, evidence packages, drafting material, and preparation workflows for review before filing or use in court.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f8faf8] text-[#16302b]">
      {/* WHAT THIS SITE DOES -- one sentence, stated once */}
      <section className="border-b border-[#d9e6df] bg-white">
        <div className="mx-auto max-w-4xl px-6 py-12 text-center sm:py-16">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-[#10231f] sm:text-3xl">
            CourtSimplified helps people representing themselves in Ontario
            court organize their case, evidence, and documents in one place.
          </h1>
        </div>
      </section>

      {/* HomeLocationGate reads ?path= via useSearchParams(), which bails out
          of static prerendering unless wrapped. It renders null without that
          param -- the default home state -- so null is the matching fallback. */}
      <Suspense fallback={null}>
        <HomeLocationGate />
      </Suspense>

      {/* COURT / TOPIC SELECTION -- the one step that gets a visitor to the
          right court type. Cards link to each court-type landing page, never
          straight to /builder: intake always starts from a court-type page. */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-[#10231f] sm:text-3xl">
          What kind of matter is this?
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {courtPaths.map(({ title, href, description, Icon }) => (
            <Link
              key={title}
              href={href}
              className="group flex h-full flex-col rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2f7d67] hover:shadow-md"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf7f3] text-[#2f7d67]">
                <Icon className="h-6 w-6" />
              </span>

              <span className="mt-4 text-xl font-bold text-[#10231f]">
                {title}
              </span>

              <span className="mt-2 text-sm leading-6 text-[#557168]">
                {description}
              </span>
            </Link>
          ))}

          <NotSureCourtGuide />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-[#d9e6df] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h2 className="mb-10 text-3xl font-bold tracking-tight text-[#10231f]">
            How the platform works
          </h2>

          <div className="space-y-10">
            {workflowSteps.map((item, index) => (
              <div key={item.title}>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#2f7d67]">
                  Step {index + 1}
                </p>

                <h3 className="mt-2 text-2xl font-bold text-[#10231f]">
                  {item.title}
                </h3>

                <p className="mt-3 max-w-4xl text-base leading-8 text-[#557168]">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY COURTSIMPLIFIED EXISTS -- condensed, distinct from the header sentence */}
      <section className="border-t border-[#193e3a] bg-[#0b2c2d] text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#55d7cb]">
            Why CourtSimplified exists
          </p>

          <h2 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight md:text-4xl">
            Access to justice should not depend on how much money you have.
          </h2>

          <p className="mt-5 max-w-4xl text-base leading-8 text-[#c7dfdb] md:text-lg">
            Full legal representation can cost thousands of dollars, so many
            people represent themselves. CourtSimplified is being built to
            give them a more affordable, practical way to organize their case
            and prepare for court — without replacing a lawyer or guaranteeing
            an outcome.
          </p>

          <Link
            href="/about"
            className="mt-6 inline-flex text-sm font-semibold text-[#55d7cb] underline underline-offset-4 hover:text-white"
          >
            More about CourtSimplified →
          </Link>
        </div>
      </section>
    </main>
  );
}
