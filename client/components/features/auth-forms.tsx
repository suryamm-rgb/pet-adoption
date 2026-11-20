"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Photo } from "@/components/ui/photo";
import { photo } from "@/lib/images";
import { Field, FormError, Input, Select } from "@/components/ui/form";
import { api, errorText } from "@/lib/api";
import { homeFor, useAuth } from "@/lib/auth";
import { GoogleButton } from "./google-button";

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-var(--spacing-header)-2.5rem)] max-w-[88rem] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <Photo src={photo("hero", 1200, 1400)} alt="" className="absolute inset-0 size-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <p className="font-display text-3xl font-semibold leading-tight">Travel without worry. Your pet is in good hands.</p>
          <ul className="mt-5 space-y-2 text-sm text-white/85">
            <li>✓ ID-verified caretakers</li><li>✓ Daily photo updates</li><li>✓ Payment held until your pet is home</li>
          </ul>
        </div>
      </div>
      <div className="flex items-center justify-center bg-hero px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-7">
            <span className="text-4xl" aria-hidden>🐾</span>
            <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
            {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
          </div>
          <Card className="shadow-pop"><CardBody className="p-5 sm:p-7">{children}</CardBody></Card>
          {footer && <p className="mt-6 text-center text-sm text-muted">{footer}</p>}
        </div>
      </div>
    </div>
  );
}

const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

const loginSchema = z.object({ email: z.string().email("Enter a valid email"), password: z.string().min(1, "Enter your password") });

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  return (
    <AuthShell title="Welcome back" subtitle="Log in to manage pets and bookings" footer={<>New here? <Link href="/register" className="font-medium text-primary hover:underline">Create an account</Link></>}>
      <GoogleButton onSuccess={(u) => router.push(next ?? homeFor(u))} onError={setError} />
      <form className="mt-4 space-y-4" noValidate onSubmit={handleSubmit(async (v) => {
        setError("");
        try { const u = await login(v.email, v.password); router.push(next ?? homeFor(u)); } catch (e) { setError(errorText(e)); }
      })}>
        <FormError message={error} />
        <Field label="Email" htmlFor="email" error={errors.email?.message}><Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} /></Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}><Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register("password")} /></Field>
        <div className="text-right text-sm"><Link href="/forgot-password" className="text-primary hover:underline">Forgot password?</Link></div>
        <Button type="submit" className="w-full" loading={isSubmitting}>Log in</Button>
      </form>
    </AuthShell>
  );
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().trim().min(7, "Enter a valid phone").max(20),
  city: z.string().trim().min(2, "Enter your city"),
  role: z.enum(["owner", "caretaker"]),
  password: z.string().min(8, "At least 8 characters"),
});

export function RegisterForm() {
  const { register: signUp } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [role, setRole] = useState("owner");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema), defaultValues: { role: "owner" } });

  return (
    <AuthShell title="Create your account" subtitle="Free to join. Takes a minute." footer={<>Already registered? <Link href="/login" className="font-medium text-primary hover:underline">Log in</Link></>}>
      <GoogleButton role={role === "caretaker" ? "caretaker" : "owner"} onSuccess={(u) => router.push(role === "caretaker" ? "/caretaker/profile" : homeFor(u))} onError={setError} />
      <form className="mt-4 space-y-4" noValidate onSubmit={handleSubmit(async (v) => {
        setError("");
        try { const u = await signUp(v); router.push(v.role === "caretaker" ? "/caretaker/profile" : homeFor(u)); } catch (e) { setError(errorText(e)); }
      })}>
        <FormError message={error} />
        <Field label="I want to" htmlFor="role" hint={role === "caretaker" ? "You will upload ID proof and be visible after admin approval." : undefined}>
          <Select id="role" {...register("role", { onChange: (e) => setRole(e.target.value) })}><option value="owner">Leave my pet with a caretaker</option><option value="caretaker">Become a caretaker</option></Select>
        </Field>
        <Field label="Full name" htmlFor="name" error={errors.name?.message}><Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} /></Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}><Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" htmlFor="phone" error={errors.phone?.message}><Input id="phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} {...register("phone")} /></Field>
          <Field label="City" htmlFor="city" error={errors.city?.message}><Input id="city" autoComplete="address-level2" aria-invalid={!!errors.city} {...register("city")} /></Field>
        </div>
        <Field label="Password" htmlFor="password" error={errors.password?.message}><Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} /></Field>
        <Button type="submit" className="w-full" loading={isSubmitting}>Sign up</Button>
      </form>
    </AuthShell>
  );
}

export function ForgotForm() {
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>({ resolver: zodResolver(z.object({ email: z.string().email("Enter a valid email") })) });
  return (
    <AuthShell title="Reset your password" subtitle="We will email you a reset link" footer={<Link href="/login" className="font-medium text-primary hover:underline">Back to log in</Link>}>
      {done !== null ? (
        <div className="space-y-3 text-center text-sm">
          <p className="rounded-md bg-success-50 p-3 text-success-700">If that email is registered, a reset link is on its way.</p>
          {done && <p className="text-muted">Dev mode: <Link className="font-medium text-primary underline" href={`/reset-password?token=${done}`}>open the reset link</Link></p>}
        </div>
      ) : (
        <form className="space-y-4" noValidate onSubmit={handleSubmit(async (v) => {
          setError("");
          try { const r = await api<{ devToken?: string }>("/auth/forgot-password", { method: "POST", body: v }); setDone(r.devToken ?? ""); } catch (e) { setError(errorText(e)); }
        })}>
          <FormError message={error} />
          <Field label="Email" htmlFor="email" error={errors.email?.message}><Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} /></Field>
          <Button type="submit" className="w-full" loading={isSubmitting}>Send reset link</Button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ password: string }>({ resolver: zodResolver(z.object({ password: z.string().min(8, "At least 8 characters") })) });
  return (
    <AuthShell title="Choose a new password">
      <form className="space-y-4" noValidate onSubmit={handleSubmit(async (v) => {
        setError("");
        try { await api("/auth/reset-password", { method: "POST", body: { token, password: v.password } }); router.push("/login"); } catch (e) { setError(errorText(e)); }
      })}>
        <FormError message={error} />
        <Field label="New password" htmlFor="password" error={errors.password?.message}><Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} /></Field>
        <Button type="submit" className="w-full" loading={isSubmitting} disabled={!token}>Update password</Button>
      </form>
    </AuthShell>
  );
}

export function VerifyEmail() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"working" | "ok" | "fail">("working");
  useEffect(() => {
    api("/auth/verify-email", { method: "POST", body: { token } }).then(() => setState("ok"), () => setState("fail"));
  }, [token]);
  return (
    <AuthShell title={state === "working" ? "Verifying…" : state === "ok" ? "Email verified" : "Link not valid"} subtitle={state === "ok" ? "You can now book and accept stays." : state === "fail" ? "The link is invalid or already used." : undefined}>
      <Link href="/login" className="block text-center font-medium text-primary hover:underline">Go to log in</Link>
    </AuthShell>
  );
}
