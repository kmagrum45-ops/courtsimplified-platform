import Link from "next/link";

export default function OntarioFamilyPage() {
  return (
    <main className="min-h-screen bg-[#F7FAFA] text-[#1F2937]">

      {/* HERO */}
      <section className="border-b border-[#DDEAEA] bg-[linear-gradient(180deg,#F7FEFE_0%,#FBF8F2_100%)]">
        <div className="max-w-7xl mx-auto px-6 py-16">

          <div className="mb-3 text-sm font-semibold text-[#1A9F96]">
            Ontario family law
          </div>

          <h1 className="text-5xl font-bold mb-4">
            Family law in Ontario, made clearer
          </h1>

          <p className="text-lg text-[#607376] max-w-3xl mb-6">
            This page helps you understand Ontario family law, organize your situation,
            and move into the right forms, documents, and next steps.
          </p>

          <div className="flex gap-4">
            <a href="#steps" className="bg-[#2FB8AC] text-white px-6 py-3 rounded-xl">
              See the Process
            </a>

            <Link href="/family" className="border px-6 py-3 rounded-xl">
              Back to Provinces
            </Link>
          </div>
        </div>
      </section>

      {/* OVERVIEW */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold mb-6">What this page helps with</h2>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="border p-5 rounded-xl bg-white">
            <h3 className="font-bold mb-2">Understand your situation</h3>
            <p className="text-sm text-[#607376]">
              Parenting, support, separation, or divorce — start by identifying your issue clearly.
            </p>
          </div>

          <div className="border p-5 rounded-xl bg-white">
            <h3 className="font-bold mb-2">Know the court path</h3>
            <p className="text-sm text-[#607376]">
              Learn what usually happens in Ontario family court before filing anything.
            </p>
          </div>

          <div className="border p-5 rounded-xl bg-white">
            <h3 className="font-bold mb-2">Get organized</h3>
            <p className="text-sm text-[#607376]">
              Prepare your facts, children’s details, finances, and documents early.
            </p>
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section id="steps" className="bg-[#F8FBFB] py-12">
        <div className="max-w-7xl mx-auto px-6">

          <h2 className="text-3xl font-bold mb-6">
            Typical Ontario family court path
          </h2>

          <div className="grid md:grid-cols-4 gap-6">

            <div className="border p-5 rounded-xl bg-white">
              <h3 className="font-bold mb-2">1. Identify the issue</h3>
              <p className="text-sm text-[#607376]">
                Parenting, support, separation, or divorce.
              </p>
            </div>

            <div className="border p-5 rounded-xl bg-white">
              <h3 className="font-bold mb-2">2. Prepare documents</h3>
              <p className="text-sm text-[#607376]">
                Gather timelines, financial info, and relevant records.
              </p>
            </div>

            <div className="border p-5 rounded-xl bg-white">
              <h3 className="font-bold mb-2">3. File forms</h3>
              <p className="text-sm text-[#607376]">
                Use the correct Ontario family court forms.
              </p>
            </div>

            <div className="border p-5 rounded-xl bg-white">
              <h3 className="font-bold mb-2">4. Court process</h3>
              <p className="text-sm text-[#607376]">
                Case conferences, motions, or trial depending on situation.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* TOPICS */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold mb-6">Main Ontario family topics</h2>

        <div className="grid md:grid-cols-3 gap-6">

          <div className="border p-5 rounded-xl bg-white">
            <h3 className="font-bold mb-2">Parenting</h3>
            <p className="text-sm text-[#607376]">
              Decision-making responsibility, parenting time, and schedules.
            </p>
          </div>

          <div className="border p-5 rounded-xl bg-white">
            <h3 className="font-bold mb-2">Support</h3>
            <p className="text-sm text-[#607376]">
              Child support, spousal support, and financial disclosure.
            </p>
          </div>

          <div className="border p-5 rounded-xl bg-white">
            <h3 className="font-bold mb-2">Separation & Divorce</h3>
            <p className="text-sm text-[#607376]">
              Legal separation, divorce process, and next steps.
            </p>
          </div>

        </div>
      </section>

      {/* NEXT STEP */}
      <section className="bg-[#F8FBFB] py-12">
        <div className="max-w-7xl mx-auto px-6">

          <h2 className="text-3xl font-bold mb-6">
            Move forward with your case
          </h2>

          <div className="flex gap-4 flex-wrap">

            <Link href="/start">
              <button className="bg-[#2FB8AC] text-white px-6 py-3 rounded-xl">
                Start Your Case Summary
              </button>
            </Link>

            <Link href="/forms">
              <button className="border px-6 py-3 rounded-xl">
                Go to Forms & Documents
              </button>
            </Link>

          </div>

        </div>
      </section>

    </main>
  );
}