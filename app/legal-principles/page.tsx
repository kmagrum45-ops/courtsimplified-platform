import Link from "next/link";

export default function LegalPrinciplesPage() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-12">

      {/* HEADER */}
      <h1 className="text-4xl font-bold mb-4">
        Understand how your case is actually looked at in court
      </h1>

      <p className="text-gray-600 mb-8 max-w-3xl">
        This page helps you understand how your situation may be analyzed in court.
        Instead of guessing, you can see the structure courts usually follow and
        what actually matters when decisions are made.
      </p>

      <div className="flex gap-4 mb-10">
        <Link href="/documents">
          <button className="bg-[#2FB8AC] text-white px-6 py-3 rounded-xl">
            Apply This to My Case
          </button>
        </Link>
      </div>

      {/* PRINCIPLES */}

      <div className="space-y-8">

        {/* NEGLIGENCE */}
        <div className="border p-6 rounded-xl bg-white">
          <h2 className="text-2xl font-bold mb-2">Negligence</h2>

          <p className="text-gray-600 mb-4">
            Courts usually look at whether someone had a responsibility,
            whether they failed that responsibility, and whether that caused a real loss.
          </p>

          <ul className="list-disc pl-6 text-gray-600 mb-4">
            <li>Duty (legal responsibility)</li>
            <li>Breach (what went wrong)</li>
            <li>Causation (connection to loss)</li>
            <li>Damages (actual harm or cost)</li>
          </ul>

          <div className="bg-yellow-50 p-4 rounded-lg text-sm">
            <strong>How this helps you:</strong>
            <ul className="list-disc pl-6 mt-2">
              <li>Show what the other side was responsible for</li>
              <li>Explain what they did wrong</li>
              <li>Connect it directly to your loss</li>
              <li>Back it up with documents</li>
            </ul>
          </div>
        </div>

        {/* CHARTER */}
        <div className="border p-6 rounded-xl bg-white">
          <h2 className="text-2xl font-bold mb-2">Charter / Government Action</h2>

          <p className="text-gray-600 mb-4">
            Charter issues usually involve government actions that affect rights,
            fairness, or legal processes.
          </p>

          <div className="bg-yellow-50 p-4 rounded-lg text-sm">
            <strong>How this helps you:</strong>
            <ul className="list-disc pl-6 mt-2">
              <li>Identify government involvement</li>
              <li>Show what right or process was affected</li>
              <li>Use official records and decisions</li>
            </ul>
          </div>
        </div>

        {/* CONTRACT */}
        <div className="border p-6 rounded-xl bg-white">
          <h2 className="text-2xl font-bold mb-2">Contract Disputes</h2>

          <p className="text-gray-600 mb-4">
            Courts look at what was agreed, what was not followed,
            and what loss resulted.
          </p>

          <div className="bg-yellow-50 p-4 rounded-lg text-sm">
            <strong>How this helps you:</strong>
            <ul className="list-disc pl-6 mt-2">
              <li>Show the agreement</li>
              <li>Show what was broken</li>
              <li>Show the financial or practical impact</li>
            </ul>
          </div>
        </div>

        {/* EVIDENCE */}
        <div className="border p-6 rounded-xl bg-white">
          <h2 className="text-2xl font-bold mb-2">Evidence</h2>

          <p className="text-gray-600 mb-4">
            Courts rely on records, not just statements.
            Strong cases are supported by documents and timelines.
          </p>

          <div className="bg-yellow-50 p-4 rounded-lg text-sm">
            <strong>How this helps you:</strong>
            <ul className="list-disc pl-6 mt-2">
              <li>Match events to documents</li>
              <li>Keep dates consistent</li>
              <li>Use real records instead of memory</li>
            </ul>
          </div>
        </div>

        {/* PROCEDURE */}
        <div className="border p-6 rounded-xl bg-white">
          <h2 className="text-2xl font-bold mb-2">Court Procedure</h2>

          <p className="text-gray-600 mb-4">
            Even strong cases can fail if procedures are not followed properly.
          </p>

          <div className="bg-yellow-50 p-4 rounded-lg text-sm">
            <strong>How this helps you:</strong>
            <ul className="list-disc pl-6 mt-2">
              <li>Meet deadlines</li>
              <li>Use correct forms</li>
              <li>Name the correct parties</li>
            </ul>
          </div>
        </div>

      </div>

      {/* FINAL CTA */}
      <div className="mt-12 bg-gray-100 p-6 rounded-xl text-center">
        <h3 className="font-bold mb-2">
          Ready to apply this to your case?
        </h3>

        <p className="text-gray-600 mb-4">
          Use what you’ve learned here to build a stronger case file.
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