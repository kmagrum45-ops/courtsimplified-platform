import Link from "next/link";

export default function CaseLawPage() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-12">

      {/* HEADER */}
      <h1 className="text-4xl font-bold mb-4">
        Case law that shows how courts actually reason
      </h1>

      <p className="text-gray-600 mb-8 max-w-3xl">
        This page helps you understand how courts analyze real cases.
        It is not about memorizing citations — it is about learning how judges
        move from facts, to law, to decisions.
      </p>

      <div className="flex gap-4 mb-10">
        <Link href="/documents">
          <button className="bg-[#2FB8AC] text-white px-6 py-3 rounded-xl">
            Apply This to My Case
          </button>
        </Link>
      </div>

      {/* HOW TO USE */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">
          How to use case law properly
        </h2>

        <div className="grid md:grid-cols-4 gap-4">

          <div className="border p-4 rounded-xl bg-white">
            <strong>See the principle</strong>
            <p className="text-sm text-gray-600">
              Understand what the case is known for.
            </p>
          </div>

          <div className="border p-4 rounded-xl bg-white">
            <strong>Notice the facts</strong>
            <p className="text-sm text-gray-600">
              Look at what actually mattered to the court.
            </p>
          </div>

          <div className="border p-4 rounded-xl bg-white">
            <strong>Study reasoning</strong>
            <p className="text-sm text-gray-600">
              See how the court reached its decision.
            </p>
          </div>

          <div className="border p-4 rounded-xl bg-white">
            <strong>Use carefully</strong>
            <p className="text-sm text-gray-600">
              Cases guide thinking — they don’t guarantee outcomes.
            </p>
          </div>

        </div>
      </section>

      {/* CASES */}

      <div className="space-y-8">

        {/* DONOGHUE */}
        <div className="border p-6 rounded-xl bg-white">
          <h3 className="text-xl font-bold mb-2">
            Donoghue v. Stevenson
          </h3>

          <p className="text-gray-600 mb-4">
            A foundational negligence case explaining duty of care and responsibility.
          </p>

          <ul className="list-disc pl-6 text-gray-600 mb-4">
            <li>Shows why duty of care is a legal question</li>
            <li>Focuses on foreseeability</li>
            <li>Builds the structure of negligence law</li>
          </ul>

          <div className="bg-yellow-50 p-4 rounded-lg text-sm">
            <strong>How this helps you:</strong>
            <ul className="list-disc pl-6 mt-2">
              <li>Explain responsibility clearly</li>
              <li>Show what went wrong</li>
              <li>Connect actions to your loss</li>
            </ul>
          </div>
        </div>

        {/* FH */}
        <div className="border p-6 rounded-xl bg-white">
          <h3 className="text-xl font-bold mb-2">
            F.H. v. McDougall
          </h3>

          <p className="text-gray-600 mb-4">
            Explains the civil standard of proof — balance of probabilities.
          </p>

          <div className="bg-yellow-50 p-4 rounded-lg text-sm">
            <strong>How this helps you:</strong>
            <ul className="list-disc pl-6 mt-2">
              <li>Your evidence must be believable</li>
              <li>Consistency matters</li>
              <li>Stronger documentation improves your case</li>
            </ul>
          </div>
        </div>

        {/* BEDFORD */}
        <div className="border p-6 rounded-xl bg-white">
          <h3 className="text-xl font-bold mb-2">
            Canada (AG) v. Bedford
          </h3>

          <p className="text-gray-600 mb-4">
            A key Charter case explaining arbitrariness and overbreadth.
          </p>

          <div className="bg-yellow-50 p-4 rounded-lg text-sm">
            <strong>How this helps you:</strong>
            <ul className="list-disc pl-6 mt-2">
              <li>Structure Charter arguments properly</li>
              <li>Focus on real effects, not just feelings</li>
              <li>Connect law to actual impact</li>
            </ul>
          </div>
        </div>

        {/* ANTIC */}
        <div className="border p-6 rounded-xl bg-white">
          <h3 className="text-xl font-bold mb-2">
            R. v. Antic
          </h3>

          <p className="text-gray-600 mb-4">
            Explains bail structure and the ladder principle.
          </p>

          <div className="bg-yellow-50 p-4 rounded-lg text-sm">
            <strong>How this helps you:</strong>
            <ul className="list-disc pl-6 mt-2">
              <li>Understand procedural fairness</li>
              <li>Challenge unreasonable conditions</li>
              <li>Focus on justification and structure</li>
            </ul>
          </div>
        </div>

        {/* SATTVA */}
        <div className="border p-6 rounded-xl bg-white">
          <h3 className="text-xl font-bold mb-2">
            Sattva Capital Corp. v. Creston Moly Corp.
          </h3>

          <p className="text-gray-600 mb-4">
            Explains contract interpretation using context.
          </p>

          <div className="bg-yellow-50 p-4 rounded-lg text-sm">
            <strong>How this helps you:</strong>
            <ul className="list-disc pl-6 mt-2">
              <li>Gather full context, not just the contract</li>
              <li>Include emails and negotiations</li>
              <li>Show intent and meaning</li>
            </ul>
          </div>
        </div>

      </div>

      {/* FAQ */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Common questions</h2>

        <div className="grid md:grid-cols-2 gap-4">

          <div className="border p-4 rounded-xl bg-white">
            <strong>Do I need an identical case?</strong>
            <p className="text-gray-600 text-sm">
              No — courts care more about reasoning than identical facts.
            </p>
          </div>

          <div className="border p-4 rounded-xl bg-white">
            <strong>Can one case win my case?</strong>
            <p className="text-gray-600 text-sm">
              No — your facts, evidence, and structure still matter.
            </p>
          </div>

          <div className="border p-4 rounded-xl bg-white">
            <strong>Should I add lots of citations?</strong>
            <p className="text-gray-600 text-sm">
              No — clarity is more important than volume.
            </p>
          </div>

          <div className="border p-4 rounded-xl bg-white">
            <strong>Why is case law useful?</strong>
            <p className="text-gray-600 text-sm">
              It shows how courts think — which improves how you prepare.
            </p>
          </div>

        </div>
      </section>

      {/* CTA */}
      <div className="mt-12 bg-gray-100 p-6 rounded-xl text-center">
        <h3 className="font-bold mb-2">
          Use this reasoning in your case
        </h3>

        <p className="text-gray-600 mb-4">
          Apply what you’ve learned to your documents, evidence, and structure.
        </p>

        <Link href="/documents">
          <button className="bg-[#2FB8AC] text-white px-6 py-3 rounded-xl">
            Go to Documents
          </button>
        </Link>
      </div>

    </main>
  );
}