import { cn } from "@/lib/cn";
import { fileUrl } from "@/lib/api";
import { Photo } from "./photo";

const palette = ["bg-brand-100 text-brand-700", "bg-accent-100 text-accent-700", "bg-info-50 text-info-700", "bg-warning-50 text-warning-700", "bg-success-50 text-success-700"];

export function Avatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const tone = palette[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length];
  // eslint-disable-next-line @next/next/no-img-element
  if (src) return <img src={fileUrl(src)} alt="" className={cn("size-10 shrink-0 rounded-full object-cover", className)} />;
  return (
    <span aria-hidden className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold", tone, className)}>
      {initials}
    </span>
  );
}

const petEmoji: Record<string, string> = { Dog: "🐶", Cat: "🐱", Rabbit: "🐰", Bird: "🐦" };
export const emojiFor = (type?: string) => petEmoji[type ?? ""] ?? "🐾";

export function PetAvatar({ type, photo, className }: { type?: string; photo?: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (photo) return <img src={fileUrl(photo)} alt="" className={cn("size-14 shrink-0 rounded-xl object-cover", className)} />;
  return <span aria-hidden className={cn("inline-flex size-14 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-3xl", className)}>{emojiFor(type)}</span>;
}

export function Rating({ value, count }: { value: number; count: number }) {
  if (!count) return <span className="text-sm text-muted">New</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm" aria-label={`${value} out of 5 from ${count} reviews`}>
      <span className="text-accent-500" aria-hidden>★</span>
      <span className="font-medium">{value.toFixed(1)}</span>
      <span className="text-muted">({count})</span>
    </span>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon = "🐾", title, text, action }: { icon?: string; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong bg-surface/50 p-10 text-center">
      <div className="text-4xl" aria-hidden>{icon}</div>
      <p className="mt-3 font-medium">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}

/** Full-width title band for public listing pages. */
export function PublicHero({ title, description, image, children }: { title: string; description?: string; image?: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="mx-auto flex max-w-page items-center justify-between gap-6 px-4 py-10 sm:py-14">
        <div className="max-w-xl">
          <h1 className="text-3xl font-semibold sm:text-5xl">{title}</h1>
          {description && <p className="mt-3 text-muted sm:text-lg">{description}</p>}
          {children}
        </div>
        {image && <Photo src={image} alt="" className="hidden aspect-[4/3] w-72 shrink-0 rounded-3xl shadow-pop md:block lg:w-80" />}
      </div>
    </section>
  );
}

/** Greeting banner at the top of a dashboard. */
export function WelcomeBanner({ title, text, action, image }: { title: string; text: string; action?: React.ReactNode; image?: string }) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-3xl bg-brand-gradient text-white shadow-glow">
      {image && <Photo src={image} alt="" className="absolute inset-y-0 right-0 hidden h-full w-1/3 opacity-90 [mask-image:linear-gradient(to_left,black_50%,transparent)] md:block" />}
      <div className="relative flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
        <div className="max-w-lg">
          <h1 className="text-2xl font-semibold sm:text-4xl">{title}</h1>
          <p className="mt-1 text-white/80">{text}</p>
        </div>
        {action}
      </div>
    </div>
  );
}
