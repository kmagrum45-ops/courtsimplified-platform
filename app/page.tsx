import { Suspense } from "react";
import Link from "next/link";
import HomeLocationGate from "./_components/HomeLocationGate";
import NotSureCourtGuide from "./_components/NotSureCourtGuide";

const casePaths = [
  {
    title: "Family",
    href: "/family",
    description:
      "Organize parenting, support, separation, divorce, property, timelines, evidence, and court documents in one structured workspace.",
    image:
      "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80",
    features: [
      "Parenting & decision-making",
      "Financial disclosure",
      "Affidavits & conference prep",
    ],
  },
  {
    title: "Small Claims",
    href: "/small-claims",
    description:
      "Build organized claims involving money owed, contracts, negligence, defamation, services, property damage, and business disputes.",
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
    features: [
      "Settlement conference prep",
      "Evidence organization",
      "Court-ready document workflow",
    ],
  },
  {
    title: "Civil",
    href: "/civil",
    description:
      "Prepare structured civil litigation involving negligence, contracts, institutional conduct, property issues, and complex legal disputes.",
    image:
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
    features: [
      "Litigation strategy",
      "Chronology & evidence mapping",
      "Advanced drafting workflows",
    ],
  },
];

const platformFeatures = [
  {
    title: "Intelligent Case Intake",
    text: "Tell your story in your own words. CourtSimplified helps organize facts, identify missing information, connect evidence, and structure the next questions for your case.",
  },
  {
    title: "Evidence Organization",
    text: "Build timelines, organize exhibits, connect evidence to legal issues, and prepare structured court-ready materials.",
  },
  {
    title: "Smart Forms System",
    text: "Find official forms, show verified source information when available, organize supporting documents, and prepare materials for review.",
  },
  {
    title: "Drafting & Case Preparation",
    text: "Prepare organized drafts, affidavits, claims, conference materials, timelines, and other case documents inside one connected workspace.",
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
      {/* DEVELOPMENT NOTICE */}
      <section
        aria-label="CourtSimplified development notice"
        className="border-b border-[#f1c78d] bg-[#fff4e5]"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9a4f13]">
              Ontario beta in development
            </p>

            <p className="mt-1 max-w-4xl text-sm leading-6 text-[#6f4727]">
              CourtSimplified is currently in active development and is expected
              to launch an Ontario beta in the coming months. Features,
              information, and workflows may change during testing.
            </p>
          </div>

          <p className="shrink-0 text-sm font-semibold text-[#7d4318]">
            Not legal advice
          </p>
        </div>
      </section>

      {/* FULL-WIDTH LEGAL HERO */}
      <section
        className="relative isolate min-h-[620px] overflow-hidden border-b border-[#193e3a] bg-[#071f22] bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=2000&q=90')",
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 -z-10 bg-[#041e22]/72" />

        {/* Gradient keeps the text side darker */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#031d21] via-[#06282b]/90 to-[#06282b]/25" />

        {/* Soft bottom fade */}
        <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-[#071f22]/85 to-transparent" />

        <div className="mx-auto flex min-h-[620px] max-w-7xl items-center px-6 py-20">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.28em] text-[#39d4c7]">
              Built for self-represented litigants
            </p>

            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Making court more understandable for people representing themselves.
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#d4e8e4] md:text-xl">
              CourtSimplified brings case organization, evidence management,
              document preparation, timelines, forms, and court workflow tools
              together in one connected platform designed around the needs of
              self-represented litigants.
            </p>

            <div className="mt-9 flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium text-[#b8d7d2]">
              <span>Built for self-represented litigants</span>
              <span>Affordable case-based access</span>
              <span>Connected case organization</span>
            </div>
          </div>
        </div>
      </section>

      {/* ACCESS TO JUSTICE MISSION */}
      <section className="border-b border-[#d9e6df] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#2f7d67]">
              Why CourtSimplified exists
            </p>

            <h2 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight text-[#10231f] md:text-4xl">
              Access to justice should not depend on how much money you have.
            </h2>

            <p className="mt-5 max-w-4xl text-base leading-8 text-[#557168] md:text-lg">
              Many people must represent themselves because full legal
              representation can cost thousands of dollars. CourtSimplified is
              being built to give self-represented litigants a more affordable
              way to understand court procedures, organize evidence, prepare
              documents, and manage their case from beginning to end.
            </p>

            <p className="mt-4 max-w-4xl text-base leading-8 text-[#557168]">
              Our goal is to provide practical, structured tools at a cost
              ordinary people can manage, while clearly recognizing when court
              requirements should be verified or professional legal assistance
              may be needed.
            </p>
          </div>

        </div>
      </section>

      {/* HomeLocationGate reads ?path= via useSearchParams(), which bails out
          of static prerendering unless wrapped. It renders null without that
          param — the default home state — so null is the matching fallback. */}
      <Suspense fallback={null}>
        <HomeLocationGate />
      </Suspense>
      <NotSureCourtGuide />

      {/* COURT PATHS */}
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-[#10231f]">
            Choose your court path
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-[#557168]">
            Each path includes intelligent intake, document organization,
            evidence workflows, and drafting support tailored to your matter.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {casePaths.map((item) => (
            <div
              key={item.title}
              className="overflow-hidden rounded-3xl border border-[#d8e6df] bg-white shadow-sm"
            >
              <img
                src={item.image}
                alt={item.title}
                className="h-56 w-full object-cover"
              />

              <div className="p-6">
                <h3 className="text-2xl font-bold text-[#10231f]">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[#5a736a]">
                  {item.description}
                </p>

                <ul className="mt-5 space-y-2">
                  {item.features.map((feature) => (
                    <li
                      key={feature}
                      className="text-sm font-medium text-[#2f7d67]"
                    >
                      • {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/builder?path=${item.href.slice(1)}`}
                  className="mt-6 inline-flex rounded-xl bg-[#2f7d67] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#276a57]"
                >
                  Start case
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PLATFORM FEATURES */}
      <section className="border-t border-[#d9e6df] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-[#10231f]">
              Built around the needs of people representing themselves
            </h2>

            <p className="mt-3 max-w-3xl text-base leading-7 text-[#557168]">
              Most legal technology has traditionally been designed for legal
              professionals and law firms. CourtSimplified is being built
              specifically for people managing their own court matters.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {platformFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-[#d8e6df] bg-[#f8fcfb] p-7"
              >
                <h3 className="text-2xl font-bold text-[#10231f]">
                  {feature.title}
                </h3>

                <p className="mt-4 leading-8 text-[#557168]">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="border-t border-[#d9e6df] bg-[#f8faf8]">
        <div className="mx-auto max-w-7xl px-6 py-14">
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
      {/* CLOSING MISSION */}
      <section className="border-t border-[#193e3a] bg-[#0b2c2d] text-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#55d7cb]">
            Our mission
          </p>

          <h2 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight md:text-4xl">
            Affordable, practical technology for people navigating court on
            their own.
          </h2>

          <p className="mt-5 max-w-4xl text-base leading-8 text-[#c7dfdb] md:text-lg">
            CourtSimplified is being built to help self-represented litigants
            understand procedures, organize evidence, prepare case materials,
            and keep their legal matter connected in one place. It does not
            replace a lawyer or guarantee an outcome, but it can help make the
            court process more understandable, organized, and manageable.
          </p>
        </div>
      </section>
    </main>
  );
}
