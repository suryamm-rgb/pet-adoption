import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl" aria-hidden>🐾</p>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted">This page wandered off. Let us take you home.</p>
      <ButtonLink href="/" className="mt-6">Back to home</ButtonLink>
    </div>
  );
}
