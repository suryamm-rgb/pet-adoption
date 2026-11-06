import type { Metadata } from "next";
import { ProfileEditor } from "@/components/features/caretaker-views";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Profile" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function Page() {
  return (
    <>
      <PageHeader title="Profile and verification" description="Owners only see you after admin approval." />
      <ProfileEditor />
    </>
  );
}
