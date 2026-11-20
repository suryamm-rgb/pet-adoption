"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/report-error";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => reportError(error, "boundary"), [error]);
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl" aria-hidden>😿</p>
      <h1 className="mt-4 text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted">Please try again. If it keeps happening, contact support.</p>
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </div>
  );
}
