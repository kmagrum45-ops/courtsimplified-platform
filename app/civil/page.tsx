import Link from "next/link";

const civilAreas = [
  {
    title: "Negligence and harm",
    text: "Injury, unsafe conduct, institutional failure, professional negligence, property damage, unsafe premises, public safety failures, or loss caused by another person, business, professional, or institution.",
  },
  {
    title: "Contracts and money disputes",
    text: "Broken agreements, unpaid invoices, construction disputes, service problems, loans, business disputes, consumer issues, and financial losses.",
  },
  {
    title: "Human Rights and discrimination",
    text: "Disability, race, sex, family status, accommodation, employment, housing, services, education, and tribunal-related issues.",
  },
  {
    title: "Charter and government action",
    text: "Police, Crown, government bodies, public institutions, procedural unfairness, state-caused harm, equality, security of the person, and abuse of authority.",
  },
  {
    title: "Defamation and reputation",
    text: "False statements, reputational harm, online posts, workplace rumours, family conflict spillover, public accusations, and business damage.",
  },
  {
    title: "Privacy, records, and digital evidence",
    text: "Improper disclosure, misuse of personal information, institutional records, surveillance, access requests, screenshots, messages, metadata, and digital proof.",
  },
];

const civilWorkflow = [
  {
    title: "Classify the legal path",
    text: "The system should identify whether the matter is negligence, contract, defamation, privacy, Charter, human rights, employment, property, institutional failure, or a mixed civil claim.",
  },
  {
    title: "Build the factual record",
    text: "The user’s story must be organized into facts, timeline events, parties, witnesses, documents, damages, missing records, contradictions, and proof gaps.",
  },
  {
    title: "Connect allegations to evidence",
    text: "Every major allegation should be linked to screenshots, photos, contracts, reports, medical records, emails, text messages, official records, or witness information.",
  },
  {
    title: "Test risk and defence arguments",
    text: "The system should identify limitation risks, causation weaknesses, damages issues, credibility concerns, missing proof, and the strongest arguments the other side may raise.",
  },
  {
    title: "Generate litigation outputs",
    text: "The case should move into forms, claim drafting, affidavit support, evidence organization, court package preparation, procedural guidance, and export-ready documents.",
  },
];

const systemModules = [
  "Legal theory mapping",
  "Timeline engine",
  "Evidence relationship engine",
  "Contradiction detection",
  "Proof gap analysis",
  "Damages organization",
  "Defence-risk review",
  "Form recommendation",
  "Court package preparation",
  "Strategy guidance",
  "Document export",
  "Restoration-ready case context",
];

export default function CivilPage() {
  return (
    <main className="min-h-screen bg-[#f8faf8] text-[#16302b]">
      <section className="border-b border-[#d9e6df] bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#2f7d67]">
              Civil Litigation
            </p>

            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-[#10231f] md:text-5xl">
              Build a structured civil case with legal theory, evidence,
              strategy, timelines, and court-ready documents.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#4d675f]">
              Civil cases are not just forms. CourtSimplified helps organize the
              legal path, facts, evidence, damages, causation, procedural risks,
              possible defences, and the documents needed to move a case
              forward with structure.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/builder?path=civil"
                className="rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#256b58]"
              >
                Start Civil Intake →
              </Link>

              <Link
                href="/ontario-civil"
                className="rounded-full border border-[#bdd4ca] bg-white px-6 py-3 text-sm font-semibold text-[#1c473d] transition hover:border-[#2f7d67] hover:text-[#2f7d67]"
              >
                Ontario Civil Information
              </Link>

              <Link
                href="/forms?path=civil"
                className="rounded-full border border-[#2f7d67] bg-white px-6 py-3 text-sm font-semibold text-[#2f7d67] transition hover:bg-[#eef8f5]"
              >
                Browse Civil Forms
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[#d8e6df] bg-white shadow-sm">
            <img
              src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1400&q=80"
              alt="Courthouse for civil litigation"
              className="h-[380px] w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <h2 className="text-3xl font-bold text-[#10231f]">
          Civil issues CourtSimplified can help organize
        </h2>

        <p className="mt-3 max-w-3xl leading-7 text-[#557168]">
          Civil litigation can involve court claims, tribunal paths,
          institutional failure, damages, government conduct, rights-based
          issues, reputation harm, and evidence-heavy disputes.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {civilAreas.map((area) => (
            <div
              key={area.title}
              className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <h3 className="text-xl font-bold text-[#10231f]">
                {area.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-[#557168]">
                {area.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[#d9e6df] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h2 className="text-3xl font-bold text-[#10231f]">
            Built as a civil case operating system
          </h2>

          <p className="mt-4 max-w-4xl text-lg leading-8 text-[#4d675f]">
            The civil workflow should turn intake answers into a structured case
            context: issues, events, evidence, proof gaps, contradictions,
            credibility concerns, form needs, risks, next steps, and court
            package notes.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {systemModules.map((module) => (
              <div
                key={module}
                className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfb] px-5 py-4 text-sm font-semibold text-[#234a41]"
              >
                {module}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <h2 className="text-3xl font-bold text-[#10231f]">
          Civil case workflow
        </h2>

        <div className="mt-8 space-y-5">
          {civilWorkflow.map((step, index) => (
            <div
              key={step.title}
              className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#2f7d67]">
                Step {index + 1}
              </p>

              <h3 className="mt-3 text-xl font-bold text-[#10231f]">
                {step.title}
              </h3>

              <p className="mt-3 text-lg leading-8 text-[#4d675f]">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[#d9e6df] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h2 className="text-3xl font-bold text-[#10231f]">
            Human Rights belongs inside the civil system
          </h2>

          <p className="mt-4 max-w-4xl text-lg leading-8 text-[#4d675f]">
            Human Rights issues may appear alone or overlap with employment,
            housing, disability accommodation, education, government services,
            policing, institutional treatment, privacy, negligence, and Charter
            issues.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-[#d8e6df] bg-[#f8fcfb] p-6">
              <h3 className="text-xl font-bold text-[#10231f]">
                Discrimination path
              </h3>

              <p className="mt-3 text-sm leading-7 text-[#557168]">
                Identify protected grounds, unequal treatment,
                accommodation requests, records, witnesses, impacts, and
                remedy requests.
              </p>
            </div>

            <div className="rounded-3xl border border-[#d8e6df] bg-[#f8fcfb] p-6">
              <h3 className="text-xl font-bold text-[#10231f]">
                Tribunal vs court path
              </h3>

              <p className="mt-3 text-sm leading-7 text-[#557168]">
                Help users understand whether the issue may involve a tribunal,
                civil claim, judicial review, Charter issue, or combined route.
              </p>
            </div>

            <div className="rounded-3xl border border-[#d8e6df] bg-[#f8fcfb] p-6">
              <h3 className="text-xl font-bold text-[#10231f]">
                Evidence and remedies
              </h3>

              <p className="mt-3 text-sm leading-7 text-[#557168]">
                Organize timelines, refusals, accommodations, documents,
                comparator facts, impacts, losses, and requested remedies.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="rounded-3xl border border-[#d8e6df] bg-[#10231f] p-8 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#a9dfd1]">
            Advanced civil analysis
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            The system should not just ask what happened. It should understand
            what must be proven.
          </h2>

          <p className="mt-4 max-w-4xl text-lg leading-8 text-[#dcebe7]">
            A strong civil workflow separates facts from conclusions, connects
            each issue to evidence, flags weak proof, identifies missing records,
            tests causation, organizes damages, and prepares the user for
            procedural steps and opposing arguments.
          </p>
        </div>
      </section>

      <section className="border-t border-[#d9e6df] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h2 className="text-3xl font-bold text-[#10231f]">
            Continue the civil litigation workflow
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-[#557168]">
            Move from intake into evidence, forms, document drafting, litigation
            strategy, court package preparation, and export-ready materials.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/builder?path=civil"
              className="rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#256b58]"
            >
              Start Civil Intake →
            </Link>

            <Link
              href="/documents?path=civil"
              className="rounded-full border border-[#2f7d67] bg-white px-6 py-3 text-sm font-semibold text-[#2f7d67] transition hover:bg-[#eef8f5]"
            >
              Go to Civil Documents →
            </Link>

            <Link
              href="/evidence?path=civil"
              className="rounded-full border border-[#2f7d67] bg-[#f8fcfb] px-6 py-3 text-sm font-semibold text-[#2f7d67] transition hover:bg-[#eef8f5]"
            >
              Open Evidence Workspace →
            </Link>

            <Link
              href="/dashboard"
              className="rounded-full border border-[#bdd4ca] bg-white px-6 py-3 text-sm font-semibold text-[#1c473d] transition hover:border-[#2f7d67] hover:text-[#2f7d67]"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}