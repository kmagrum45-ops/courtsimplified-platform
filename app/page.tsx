import Link from "next/link";

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
    title: "AI Legal Intake",
    text: "Tell your story once. CourtSimplified analyzes legal issues, risks, missing information, evidence concerns, and next procedural steps.",
  },
  {
    title: "Evidence Organization",
    text: "Build timelines, organize exhibits, connect evidence to legal issues, and prepare structured court-ready materials.",
  },
  {
    title: "Smart Forms System",
    text: "Search official forms, generate filled PDFs, organize supporting documents, and prepare filing packages.",
  },
  {
    title: "Drafting & Strategy",
    text: "Develop affidavits, claims, conference briefs, litigation strategy, and structured legal arguments inside one workspace.",
  },
];

const workflowSteps = [
  {
    title: "Choose your court path",
    text: "Start with Family, Small Claims, or Civil depending on your situation.",
  },
  {
    title: "Complete intelligent intake",
    text: "The platform analyzes facts, evidence, legal issues, damages, procedural concerns, and possible next steps.",
  },
  {
    title: "Build your case workspace",
    text: "Keep forms, evidence, drafting, timelines, and strategy connected to one organized case file.",
  },
  {
    title: "Prepare court-ready materials",
    text: "Generate organized documents, evidence packages, drafting material, and litigation preparation workflows.",
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
              CourtSimplified Platform
            </p>

            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Organize your legal case with structure, clarity, and strategy.
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#d4e8e4] md:text-xl">
              CourtSimplified combines intelligent intake, evidence organization,
              drafting assistance, litigation strategy, timelines, forms, and
              court workflow tools into one connected platform.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/builder"
                className="rounded-2xl bg-[#2FB8AC] px-7 py-4 font-semibold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#239B91]"
              >
                Start Your Case
              </Link>

              <Link
                href="/dashboard"
                className="rounded-2xl border border-white/55 bg-black/15 px-7 py-4 font-semibold text-white backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-white hover:bg-white/10"
              >
                Open Workspace
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium text-[#b8d7d2]">
              <span>Intelligent legal intake</span>
              <span>Evidence organization</span>
              <span>Court-ready workflows</span>
            </div>
          </div>
        </div>
      </section>

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
            <Link
              key={item.title}
              href={item.href}
              className="group overflow-hidden rounded-3xl border border-[#d8e6df] bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#2FB8AC] hover:shadow-md"
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

                <div className="mt-6 inline-flex items-center text-sm font-semibold text-[#2f7d67]">
                  Open {item.title} →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* PLATFORM FEATURES */}
      <section className="border-t border-[#d9e6df] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-[#10231f]">
              Built for serious case preparation
            </h2>

            <p className="mt-3 max-w-3xl text-base leading-7 text-[#557168]">
              CourtSimplified is designed to help users build organized,
              evidence-focused, court-ready case files.
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
    </main>
  );
}