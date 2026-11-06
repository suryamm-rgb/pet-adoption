import type { Metadata } from "next";
import { ForgotForm } from "@/components/features/auth-forms";

export const metadata: Metadata = { title: "Forgot password" };

export default function Page() {
  return <ForgotForm />;
}
