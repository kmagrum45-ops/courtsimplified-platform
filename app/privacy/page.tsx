import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy & Terms of Use | CourtSimplified",
  description:
    "How CourtSimplified collects, uses, and protects personal information, and the terms that apply to using the platform.",
};

const CONTACT_EMAIL = "privacy@courtsimplified.com";

const LAST_UPDATED = "September 2026";

/**
 * Held as data rather than inline JSX so the policy text stays exactly as
 * written, without apostrophes and em dashes being escaped into HTML entities.
 *
 * A paragraph is either a plain string, or a `lead`/`text` pair where the lead
 * is rendered in bold at the start of the paragraph — the pattern this policy
 * uses for defined terms ("Account information.", "Governing law.").
 */
type Paragraph = string | { lead: string; text: string };

type Section = {
  heading: string;
  paragraphs?: Paragraph[];
  bullets?: { lead: string; text: string }[];
  /** Rendered after the bullets, where a section needs a closing line. */
  closing?: string;
};

const sections: Section[] = [
  {
    heading: "About CourtSimplified",
    paragraphs: [
      "CourtSimplified provides legal information and case-organization tools for people representing themselves in Ontario courts. We are not a law firm, we do not provide legal advice, and using CourtSimplified does not create a lawyer-client relationship. For advice about your situation, speak with a licensed lawyer or paralegal.",
      "This policy explains how we collect, use, and protect personal information in accordance with Canada's Personal Information Protection and Electronic Documents Act (PIPEDA).",
    ],
  },
  {
    heading: "Information we collect",
    paragraphs: [
      {
        lead: "Account information.",
        text: "Your email address and password. Passwords are stored in encrypted form and cannot be read by us.",
      },
      {
        lead: "Case information.",
        text: "The details you enter about your matter, including dates, events, people involved, amounts in dispute, and your answers to intake questions. In family matters, this may include financial information and information about children.",
      },
      {
        lead: "Files and documents.",
        text: "Evidence you upload and documents the platform prepares for you.",
      },
      "We collect only the information needed to provide the service.",
    ],
  },
  {
    heading: "How we use your information",
    paragraphs: [
      "We use your information to operate the service, organize your case information, prepare your documents, respond to your requests, and keep the platform secure. We do not use your information for advertising, and we do not sell it. Information you provide about other people involved in your matter is used only to prepare your documents.",
    ],
  },
  {
    heading: "Service providers",
    paragraphs: [
      "We share information only with the providers that help us run the service, and only as needed for them to do so:",
    ],
    bullets: [
      { lead: "Supabase", text: "hosts our database and file storage in Canada." },
      {
        lead: "OpenAI",
        text: "processes the text you write to help organize it and suggest form content. Information sent to OpenAI is not used to train its models and may be retained by OpenAI for up to 30 days for abuse monitoring before deletion.",
      },
      {
        lead: "Resend",
        text: "delivers account emails. Only your email address and the email content are shared.",
      },
    ],
    closing: "We may also disclose information where required by law.",
  },
  {
    heading: "Where your information is stored",
    paragraphs: [
      "Your information is stored in Canada. AI processing by OpenAI takes place outside Canada and may be subject to the laws of the jurisdiction where it is processed.",
    ],
  },
  {
    heading: "Security",
    paragraphs: [
      "Your information is encrypted in transit and at rest, and access is restricted to authorized personnel. No system is completely secure, but we take reasonable measures to protect your information.",
    ],
  },
  {
    heading: "Emails",
    paragraphs: [
      "We only send account-related emails, such as password reset and sign-in links. We do not send marketing or newsletters.",
    ],
  },
  {
    heading: "Cookies and browser storage",
    paragraphs: [
      "We use only essential cookies needed for the site to function. Your sign-in session and a working copy of your case are kept in your browser's local storage so you can pick up where you left off. Signing out clears your session. We do not use tracking cookies, advertising cookies, analytics, or session-recording tools.",
      "If you use a shared or public computer, sign out and clear your browsing data when you finish.",
    ],
  },
  {
    heading: "Retention and deletion",
    paragraphs: [
      `We keep your information while your account is active. To delete your account, email ${CONTACT_EMAIL}. We will delete your account, case information, and uploaded files, and confirm by email when it is done.`,
    ],
  },
  {
    heading: "Your rights",
    paragraphs: [
      "You may request access to the personal information we hold about you, ask us to correct it, or withdraw your consent to its use. Withdrawing consent may mean we can no longer provide the service. If you have a concern we have not resolved, you may contact the Office of the Privacy Commissioner of Canada at priv.gc.ca.",
    ],
  },
  {
    heading: "Terms of use",
    paragraphs: [
      {
        lead: "Legal information, not legal advice.",
        text: "CourtSimplified explains court procedures and forms. You are responsible for your own decisions and filings. Always confirm forms, rules, and deadlines with official court sources.",
      },
      {
        lead: "Accuracy.",
        text: "We work to keep our information current, but laws and court procedures change, and we cannot guarantee that all information is complete or up to date.",
      },
      {
        lead: "Your responsibilities.",
        text: "Provide accurate information, keep your password secure, and use the platform lawfully.",
      },
      {
        lead: "Limitation of liability.",
        text: "To the extent permitted by law, CourtSimplified is not liable for the outcome of any legal matter or for losses arising from use of the platform.",
      },
      {
        lead: "Governing law.",
        text: "These terms are governed by the laws of Ontario and the federal laws of Canada that apply there.",
      },
      {
        lead: "Changes.",
        text: "We may update this policy and these terms. The date at the top shows when they last changed.",
      },
    ],
  },
];

function paragraphKey(paragraph: Paragraph): string {
  return typeof paragraph === "string"
    ? paragraph.slice(0, 40)
    : `${paragraph.lead}${paragraph.text.slice(0, 24)}`;
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f8faf8] text-[#16302b]">
      <section className="border-b border-[#d9e6df] bg-white">
        <div className="mx-auto w-full max-w-3xl px-6 py-16">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#2f7d67]">
            Privacy & Terms
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#10231f] md:text-5xl">
            {"Privacy Policy & Terms of Use"}
          </h1>

          <p className="mt-6 text-lg leading-8 text-[#4f685f]">
            {`Last updated: ${LAST_UPDATED}`}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="rounded-3xl border border-[#d9e6df] bg-white p-6 md:p-8">
          {sections.map((section, index) => (
            <div
              key={section.heading}
              className={index === 0 ? "" : "mt-10 border-t border-[#e5ece9] pt-10"}
            >
              <h2 className="text-2xl font-bold tracking-tight text-[#10231f]">
                {section.heading}
              </h2>

              {section.paragraphs?.map((paragraph) => (
                <p
                  key={paragraphKey(paragraph)}
                  className="mt-4 text-lg leading-8 text-[#4f685f]"
                >
                  {typeof paragraph === "string" ? (
                    paragraph
                  ) : (
                    <>
                      <strong className="font-semibold text-[#10231f]">
                        {paragraph.lead}
                      </strong>
                      {` ${paragraph.text}`}
                    </>
                  )}
                </p>
              ))}

              {section.bullets ? (
                <ul className="mt-4 list-disc space-y-3 pl-6 text-lg leading-8 text-[#4f685f]">
                  {section.bullets.map((bullet) => (
                    <li key={bullet.lead}>
                      <strong className="font-semibold text-[#10231f]">
                        {bullet.lead}
                      </strong>
                      {` ${bullet.text}`}
                    </li>
                  ))}
                </ul>
              ) : null}

              {section.closing ? (
                <p className="mt-4 text-lg leading-8 text-[#4f685f]">
                  {section.closing}
                </p>
              ) : null}
            </div>
          ))}

          <div className="mt-10 border-t border-[#e5ece9] pt-10">
            <h2 className="text-2xl font-bold tracking-tight text-[#10231f]">
              {"Contact"}
            </h2>

            <p className="mt-4 text-lg leading-8 text-[#4f685f]">
              {"Privacy Officer, CourtSimplified"}
            </p>

            <p className="mt-1 text-lg leading-8 text-[#4f685f]">
              <a
                className="font-semibold text-[#2f7d67] underline transition hover:text-[#256454]"
                href={`mailto:${CONTACT_EMAIL}`}
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
