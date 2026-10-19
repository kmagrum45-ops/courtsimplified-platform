import Link from "next/link";

/**
 * Shown when a guest asks for case guidance. Every area's analysis runs the AI
 * danger/distress safety check first, and that check needs an account, so a
 * guest is asked to sign in rather than reaching analysis unchecked ("Session
 * 19" for Small Claims; Family and Civil from 2026-10-18, site owner).
 */
export default function SignInForSafetyCheck({ area }: { area: "Small Claims" | "Family" | "Civil" }) {
  return (
    <div data-testid="sign-in-for-safety-check" className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
      Please sign in to continue. {area} intake requires a signed-in account so
      CourtSimplified can run its safety check before analyzing your case.{" "}
      <Link href="/login" className="font-semibold underline">
        Sign in
      </Link>
    </div>
  );
}
