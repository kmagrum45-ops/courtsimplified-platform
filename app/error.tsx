"use client";

import PageError from "./_components/PageError";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PageError error={error} reset={reset} where="page" />;
}
