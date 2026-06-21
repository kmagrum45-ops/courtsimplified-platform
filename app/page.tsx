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

      {/* HERO */}
      <section className="border-b border-[#d9e6df] bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">

          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#2f7d67]">
              CourtSimplified Platform
            </p>

            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-[#10231f] md:text-6xl">
              Organize your legal case with structure, clarity, and strategy.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#4f685f]">
              CourtSimplified combines intelligent intake, evidence organization,
              drafting assistance, litigation strategy, timelines, forms,
              and court workflow tools into one connected platform.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">

              <Link
                href="/builder"
                className="rounded-2xl bg-[#2FB8AC] px-7 py-4 font-semibold text-white shadow-sm transition hover:bg-[#239B91]"
              >
                Start Your Case
              </Link>

              <Link
                href="/dashboard"
                className="rounded-2xl border border-[#d7e7e5] bg-white px-7 py-4 font-semibold text-[#16302b] transition hover:border-[#2FB8AC]"
              >
                Open Workspace
              </Link>

            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[#d8e6df] bg-white shadow-sm">
            <img
              src="https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=1400&q=80"
              alt="Court and legal preparation"
              className="h-[420px] w-full object-cover"
            />
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