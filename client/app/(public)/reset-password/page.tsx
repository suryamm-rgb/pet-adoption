import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetForm } from "@/components/features/auth-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function Page() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
