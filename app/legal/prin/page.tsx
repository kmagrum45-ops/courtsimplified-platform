import Link from "next/link";

export default function LegalPrinciplesPage() {
  return (
    <main className="bg-white text-[#1F2937]">
      <div className="mx-auto max-w-7xl px-6 pt-6">
        <Link href="/" className="text-sm text-[#0F766E] underline">
          ← Back to main guide
        </Link>
      </div>

      {/* HERO */}
      <section className="border-b border-[#E6ECEC] py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="rounded-[28px] border border-[#E7D7BE] bg-[#FFFDF9] p-8 shadow-sm">
            <div className="mb-4 inline-flex rounded-full bg-[#FFF1D9] px-4 py-2 text-sm font-semibold text-[#8D520D]">
              Doctrine and analysis library
            </div>

            <h1 className="mb-5 text-4xl font-bold md:text-5xl">
              Legal principles explained in a clearer, stronger way.
            </h1>

            <p className="mb-5 text-lg text-[#6B5B4C]">
              This page is where CourtSimplified shows users how courts usually
              analyze legal problems. It is not here to tell a person what their
              exact case is. It is here to explain the frameworks courts commonly
              use, what elements usually matter, and what kinds of facts and
              records often become important.
            </p>

            <p className="mb-6 text-[#6B5B4C]">
              A strong legal principles page makes the whole site feel more
              serious. It gives users a way to understand negligence, Charter
              issues, contract disputes, evidence, and civil procedure without
              turning the site into direct legal advice.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href="#core-principles"
                className="rounded-full bg-[#D97B17] px-5 py-3 font-bold text-white hover:bg-[#B86208]"
              >
                Explore Principles
              </a>
              <a
                href="#faq"
                className="rounded-full border border-[#ECD9BE] bg-white px-5 py-3 font-bold text-[#2E241B]"
              >
                See Common Questions
              </a>
            </div>
          </div>

          <aside className="grid gap-4">
            <div className="rounded-[22px] border border-[#ECD9BE] bg-[#FFFDF9] p-5 shadow-sm">
              <strong className="mb-2 block text-lg text-[#B86208]">
                Negligence
              </strong>
              <span className="text-sm text-[#6B5B4C]">
                Courts often look at duty, breach, causation, and damages rather
                than just whether something unfair happened.
              </span>
            </div>

            <div className="rounded-[22px] border border-[#ECD9BE] bg-[#FFFDF9] p-5 shadow-sm">
              <strong className="mb-2 block text-lg text-[#B86208]">
                Charter and public law
              </strong>
              <span className="text-sm text-[#6B5B4C]">
                State action, process, fairness, rights impact, and legal
                justification may all matter depending on the context.
              </span>
            </div>

            <div className="rounded-[22px] border border-[#ECD9BE] bg-[#FFFDF9] p-5 shadow-sm">
              <strong className="mb-2 block text-lg text-[#B86208]">
                Evidence and procedure
              </strong>
              <span className="text-sm text-[#6B5B4C]">
                Good facts still need clear records, proper steps, and a usable
                timeline.
              </span>
            </div>
          </aside>
        </div>
      </section>

      {/* HOW TO USE */}
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 max-w-4xl">
            <span className="mb-3 inline-block text-xs font-extrabold uppercase tracking-[0.08em] text-[#B86208]">
              How to use this page
            </span>
            <h2 className="mb-3 text-3xl font-bold">
              Built to guide thinking, not replace legal advice.
            </h2>
            <p className="text-[#6B5B4C]">
              Users should come here to understand how courts usually reason.
              They should leave with a better sense of what questions matter,
              what evidence may support the issue, and what legal structure they
              may need to explore further.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-[#ECD9BE] bg-[#FFFDF9] p-6 shadow-sm">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[#FFE4B8] font-black text-[#8D520D]">
                A
              </div>
              <h3 className="mb-2 text-lg font-semibold">Issue spotting</h3>
              <p className="text-[#6B5B4C]">
                Helps users recognize the legal frameworks that may be relevant
                to their situation.
              </p>
            </div>

            <div className="rounded-[22px] border border-[#ECD9BE] bg-[#FFFDF9] p-6 shadow-sm">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[#FFE4B8] font-black text-[#8D520D]">
                B
              </div>
              <h3 className="mb-2 text-lg font-semibold">Element breakdown</h3>
              <p className="text-[#6B5B4C]">
                Shows the main parts courts often look for instead of leaving
                users with vague labels.
              </p>
            </div>

            <div className="rounded-[22px] border border-[#ECD9BE] bg-[#FFFDF9] p-6 shadow-sm">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[#FFE4B8] font-black text-[#8D520D]">
                C
              </div>
              <h3 className="mb-2 text-lg font-semibold">Evidence focus</h3>
              <p className="text-[#6B5B4C]">
                Explains what kinds of facts, records, and chronology may become
                important.
              </p>
            </div>

            <div className="rounded-[22px] border border-[#ECD9BE] bg-[#FFFDF9] p-6 shadow-sm">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[#FFE4B8] font-black text-[#8D520D]">
                D
              </div>
              <h3 className="mb-2 text-lg font-semibold">Safe framing</h3>
              <p className="text-[#6B5B4C]">
                Keeps the site educational and structured instead of making
                personal legal determinations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CORE PRINCIPLES */}
      <section id="core-principles" className="py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 max-w-4xl">
            <span className="mb-3 inline-block text-xs font-extrabold uppercase tracking-[0.08em] text-[#B86208]">
              Core principles
            </span>
            <h2 className="mb-3 text-3xl font-bold">
              The legal frameworks users most often need explained.
            </h2>
            <p className="text-[#6B5B4C]">
              These sections are written so users can understand the general
              framework, the usual questions a court asks, and what records often
              matter most.
            </p>
          </div>

          <div className="grid gap-5">
            <article className="rounded-[22px] border border-[#ECD9BE] bg-[#FFFDF9] p-6 shadow-sm">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#EFCF93] bg-[#FFF1D9] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.04em] text-[#7D5410]">
                  Negligence
                </span>
                <span className="rounded-full border border-[#EFCF93] bg-[#FFF1D9] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.04em] text-[#7D5410]">
                  Private law
                </span>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Negligence</h3>
              <p className="mb-3 text-[#6B5B4C]">
                Negligence is not just about whether something bad happened.
                Courts usually ask whether there was a legally recognized duty,
                whether the conduct may have fallen below a reasonable standard,
                whether that conduct caused the loss, and whether compensable
                damage resulted.
              </p>
              <ul className="list-disc space-y-2 pl-5 text-[#6B5B4C]">
                <li><strong>Duty:</strong> Was there a legal relationship that created a responsibility to take reasonable care?</li>
                <li><strong>Breach:</strong> Did the conduct arguably fall below what a reasonable person or actor would have done?</li>
                <li><strong>Causation:</strong> Can the loss be linked in a meaningful way to the alleged breach?</li>
                <li><strong>Damages:</strong> What actual harm, loss, injury, or expense resulted?</li>
                <li><strong>Key records:</strong> photos, reports, communications, expert material, contracts, invoices, timelines, and proof of loss.</li>
              </ul>
            </article>

            <article className="rounded-[22px] border border-[#ECD9BE] bg-[#FFFDF9] p-6 shadow-sm">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#EFCF93] bg-[#FFF1D9] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.04em] text-[#7D5410]">
                  Charter
                </span>
                <span className="rounded-full border border-[#EFCF93] bg-[#FFF1D9] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.04em] text-[#7D5410]">
                  Public law
                </span>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Charter and state action</h3>
              <p className="mb-3 text-[#6B5B4C]">
                Charter issues usually arise when government action, state
                process, or public decision-making is said to have affected a
                protected right or freedom. The analysis often depends on which
                Charter section is being raised, what state conduct is being
                challenged, and what the real deprivation or impact is.
              </p>
              <ul className="list-disc space-y-2 pl-5 text-[#6B5B4C]">
                <li><strong>State involvement:</strong> Is the issue connected to government conduct, legislation, public authority, or official process?</li>
                <li><strong>Protected interest:</strong> What right, liberty, security interest, equality interest, or procedural concern is actually being raised?</li>
                <li><strong>Process and fairness:</strong> Was the state process arbitrary, unfair, overbroad, discriminatory, or otherwise legally defective?</li>
                <li><strong>Remedy questions:</strong> Some Charter matters focus on declarations, exclusion of evidence, or other constitutional remedies rather than ordinary damages alone.</li>
                <li><strong>Key records:</strong> official decisions, legislation, policies, transcripts, reasons, notices, correspondence, and timelines.</li>
              </ul>
            </article>

            <article className="rounded-[22px] border border-[#ECD9BE] bg-[#FFFDF9] p-6 shadow-sm">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#EFCF93] bg-[#FFF1D9] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.04em] text-[#7D5410]">
                  Contract
                </span>
                <span className="rounded-full border border-[#EFCF93] bg-[#FFF1D9] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.04em] text-[#7D5410]">
                  Civil dispute
                </span>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Contract disputes</h3>
              <p className="mb-3 text-[#6B5B4C]">
                In a contract dispute, the court usually wants to know what
                agreement existed, what each side promised, what actually
                happened, and what loss flowed from the alleged breach. The
                strongest cases often turn on the documents.
              </p>
              <ul className="list-disc space-y-2 pl-5 text-[#6B5B4C]">
                <li><strong>Agreement:</strong> What were the actual terms, promises, or obligations?</li>
                <li><strong>Breach:</strong> What was not done, done late, done badly, or refused?</li>
                <li><strong>Loss:</strong> What money, delay, damage, or other measurable consequence followed?</li>
                <li><strong>Mitigation:</strong> Did the affected party take reasonable steps to reduce the loss?</li>
                <li><strong>Key records:</strong> signed agreements, emails, texts, invoices, receipts, quotes, work records, and payment history.</li>
              </ul>
            </article>

            <article className="rounded-[22px] border border-[#ECD9BE] bg-[#FFFDF9] p-6 shadow-sm">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#EFCF93] bg-[#FFF1D9] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.04em] text-[#7D5410]">
                  Evidence
                </span>
                <span className="rounded-full border border-[#EFCF93] bg-[#FFF1D9] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.04em] text-[#7D5410]">
                  Proof
                </span>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Evidence, credibility, and proof</h3>
              <p className="mb-3 text-[#6B5B4C]">
                A claim or defence is only as strong as the proof behind it. In
                civil matters, courts focus on what the records show, whether the
                timeline makes sense, and whether testimony is consistent,
                plausible, and supported.
              </p>
              <ul className="list-disc space-y-2 pl-5 text-[#6B5B4C]">
                <li><strong>Burden of proof:</strong> The party making an allegation usually has to prove it.</li>
                <li><strong>Credibility:</strong> Courts compare what a person says with documents, timing, surrounding facts, and consistency.</li>
                <li><strong>Reliability:</strong> Some evidence may be honest but still weak, incomplete, or poorly supported.</li>
                <li><strong>Best practice:</strong> Build a dated chronology and connect each important event to at least one document where possible.</li>
                <li><strong>Key records:</strong> messages, letters, photos, reports, receipts, logs, and original source material.</li>
              </ul>
            </article>

            <article className="rounded-[22px] border border-[#ECD9BE] bg-[#FFFDF9] p-6 shadow-sm">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#EFCF93] bg-[#FFF1D9] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.04em] text-[#7D5410]">
                  Procedure
                </span>
                <span className="rounded-full border border-[#EFCF93] bg-[#FFF1D9] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.04em] text-[#7D5410]">
                  Court process
                </span>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Civil procedure</h3>
              <p className="mb-3 text-[#6B5B4C]">
                A person can have strong facts and still create problems by
                missing deadlines, naming the wrong party, using the wrong form,
                or failing to serve documents properly. Procedure is often what
                keeps a case alive or causes it to unravel.
              </p>
              <ul className="list-disc space-y-2 pl-5 text-[#6B5B4C]">
                <li><strong>Correct court:</strong> The user needs the right court path before drafting or filing.</li>
                <li><strong>Correct parties:</strong> Naming the wrong person, business, or institution can create major issues.</li>
                <li><strong>Deadlines:</strong> Service, defence, motion, and filing dates can change the whole position of a case.</li>
                <li><strong>Form discipline:</strong> Good legal writing still needs the correct form and sequence.</li>
                <li><strong>Key records:</strong> issued documents, service proof, court notices, endorsements, and filing confirmations.</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* HELP + SAFE FRAMING */}
      <section className="py-14">
        <div className="mx-auto grid max-w-7xl gap-5 px-6 md:grid-cols-2">
          <div className="rounded-[22px] border border-[#ECD9BE] bg-[#FFFDF9] p-6 shadow-sm">
            <h3 className="mb-3 text-xl font-semibold">
              How this page should help users
            </h3>
            <ul className="list-disc space-y-2 pl-5 text-[#6B5B4C]">
              <li>Understand that legal labels alone are not enough.</li>
              <li>See the elements and questions a court usually works through.</li>
              <li>Recognize what evidence and records may actually matter.</li>
              <li>Connect their issue to the correct court path and documents page.</li>
              <li>Prepare for better conversations with a lawyer, clinic, or court resource.</li>
            </ul>
          </div>

          <div className="rounded-[22px] border border-[#ECD9BE] bg-[#FFFDF9] p-6 shadow-sm">
            <h3 className="mb-3 text-xl font-semibold">
              How to frame this page safely
            </h3>
            <ul className="list-disc space-y-2 pl-5 text-[#6B5B4C]">
              <li>Use phrases like “courts often consider” and “claims of this kind are commonly analyzed under.”</li>
              <li>Do not say “you definitely have a negligence claim” or “this is a Charter breach.”</li>
              <li>Keep the page educational, structural, and evidence-focused.</li>
              <li>Use this page to teach legal reasoning, not to issue personal legal conclusions.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 max-w-4xl">
            <span className="mb-3 inline-block text-xs font-extrabold uppercase tracking-[0.08em] text-[#B86208]">
              Common questions
            </span>
            <h2 className="mb-3 text-3xl font-bold">
              Questions this page should answer clearly.
            </h2>
            <p className="text-[#6B5B4C]">
              These are the kinds of questions real users have when they are
              trying to figure out whether their problem fits a legal framework.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[22px] border border-[#ECD9BE] bg-[#FFFDF9] p-6 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold">
                Does unfair treatment automatically mean negligence?
              </h3>
              <p className="text-[#6B5B4C]">
                No. Negligence usually requires more than unfairness. Courts
                often look for duty, breach, causation, and actual damage.
              </p>
            </div>

            <div className="rounded-[22px] border border-[#ECD9BE] bg-[#FFFDF9] p-6 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold">
                Does a government-related problem automatically make it a Charter case?
              </h3>
              <p className="text-[#6B5B4C]">
                Not always. The analysis usually depends on the kind of state
                action involved, the right or interest said to be affected, and
                the legal structure around that conduct.
              </p>
            </div>

            <div className="rounded-[22px] border border-[#ECD9BE] bg-[#FFFDF9] p-6 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold">
                If there was a contract, is that enough to win?
              </h3>
              <p className="text-[#6B5B4C]">
                Usually not by itself. Courts also look at the actual terms, the
                alleged breach, the evidence, and the loss that followed.
              </p>
            </div>

            <div className="rounded-[22px] border border-[#ECD9BE] bg-[#FFFDF9] p-6 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold">
                Why does procedure matter so much?
              </h3>
              <p className="text-[#6B5B4C]">
                Because the strongest facts can still be weakened by missed
                deadlines, poor service, wrong parties, or incomplete documents.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CALLOUT */}
      <section className="py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-[20px] border border-[#EFCF93] bg-[#FFF1D9] px-5 py-4 font-semibold text-[#7D5410]">
            The strongest legal principles page does not try to sound like a
            lawyer arguing a case. It sounds like a serious guide that teaches
            users how courts think and what they need to prepare next.
          </div>
        </div>
      </section>

      {/* NEXT LINKS */}
      <section className="py-14">
        <div className="mx-auto grid max-w-7xl gap-5 px-6 md:grid-cols-2">
          <div>
            <div className="mb-6 max-w-3xl">
              <span className="mb-3 inline-block text-xs font-extrabold uppercase tracking-[0.08em] text-[#B86208]">
                Where users go next
              </span>
              <h2 className="mb-3 text-3xl font-bold">
                Pages this doctrine library should connect to.
              </h2>
              <p className="text-[#6B5B4C]">
                Users should be able to move from legal principles into
                practical preparation without losing the thread of what they are
                doing.
              </p>
            </div>

            <div className="grid gap-3">
              <Link href="/start" className="rounded-[18px] border border-[#ECD9BE] bg-white px-4 py-4 font-extrabold text-[#2E241B] shadow-sm">
                Start Your Case
                <small className="mt-1 block font-semibold text-[#6B5B4C]">
                  Enter facts and generate a structured case summary.
                </small>
              </Link>

              <Link href="/forms" className="rounded-[18px] border border-[#ECD9BE] bg-white px-4 py-4 font-extrabold text-[#2E241B] shadow-sm">
                Documents & Forms
                <small className="mt-1 block font-semibold text-[#6B5B4C]">
                  Turn doctrine into chronology, summaries, and form-ready information.
                </small>
              </Link>

              <Link href="/small-claims" className="rounded-[18px] border border-[#ECD9BE] bg-white px-4 py-4 font-extrabold text-[#2E241B] shadow-sm">
                Ontario Small Claims Court
                <small className="mt-1 block font-semibold text-[#6B5B4C]">
                  See the practical court path for smaller money and property disputes.
                </small>
              </Link>

              <Link href="/civil" className="rounded-[18px] border border-[#ECD9BE] bg-white px-4 py-4 font-extrabold text-[#2E241B] shadow-sm">
                Ontario Civil Court
                <small className="mt-1 block font-semibold text-[#6B5B4C]">
                  See the Superior Court path for larger or more complex civil matters.
                </small>
              </Link>
            </div>
          </div>

          <div className="rounded-[22px] border border-[#ECD9BE] bg-[#FFFDF9] p-6 shadow-sm">
            <h3 className="mb-3 text-xl font-semibold">
              Important notice for your site
            </h3>
            <p className="text-[#6B5B4C]">
              This page should be presented as a legal information and doctrine
              page. It helps users understand the frameworks courts often use,
              but it should not tell users what exact legal claim they have or
              what outcome they will get.
            </p>
            <div className="mt-4 text-sm text-[#6B5B4C]">
              This page should always be treated as guided legal information,
              not legal advice. Users should compare their situation against the
              correct court rules, official forms, and, where needed, advice
              from a qualified legal professional.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}