import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/features/auth-forms";

export const metadata: Metadata = { title: "Sign up" };

export default function Page() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
