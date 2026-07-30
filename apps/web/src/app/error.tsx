"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Career workspace error", error);
  }, [error]);

  return (
    <div className="state-page" role="alert">
      <p className="eyebrow">Workspace interrupted</p>
      <h1>We could not load this part of your career workspace.</h1>
      <p>Your saved information has not been changed. Try loading the view again.</p>
      <button className="button button--primary" onClick={reset} type="button">
        Try again
      </button>
    </div>
  );
}
