import Link from "next/link";
import { Photo } from "@/components/ui/photo";
import { Avatar, Rating, emojiFor } from "@/components/ui/misc";
import { fileUrl } from "@/lib/api";
import { formatPaise } from "@/lib/format";
import { petPhoto } from "@/lib/images";
import type { Caretaker } from "@/lib/types";

export function CaretakerCard({ c }: { c: Caretaker }) {
  const cover = c.photos?.[0] ? fileUrl(c.photos[0]) : petPhoto(c.acceptedPetTypes[0], c.id, 640, 420);
  return (
    <Link href={`/caretakers/${c.id}`} className="group block h-full">
      <article className="h-full overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition duration-300 group-hover:-translate-y-1 group-hover:shadow-pop">
        <div className="relative aspect-[16/10] overflow-hidden">
          <Photo src={cover} alt="" fallback={emojiFor(c.acceptedPetTypes[0])} className="size-full transition duration-500 group-hover:scale-105" />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-semibold text-success-700 shadow-sm backdrop-blur">
            <svg viewBox="0 0 20 20" className="size-3.5 fill-current" aria-hidden><path d="M10 1.5l2.3 1.7 2.8-.2 1 2.7 2.3 1.6-.8 2.7.8 2.7-2.3 1.6-1 2.7-2.8-.2L10 18.5l-2.3-1.7-2.8.2-1-2.7-2.3-1.6.8-2.7-.8-2.7 2.3-1.6 1-2.7 2.8.2z" /><path d="M7 10.2l2 2 4-4.2" stroke="white" strokeWidth="1.6" fill="none" /></svg>
            Verified
          </span>
          <span className="absolute bottom-3 right-3 rounded-full bg-sunny px-3 py-1 text-sm font-semibold text-white shadow-sm">
            {formatPaise(c.pricePerDay)}<span className="font-normal opacity-90"> /day</span>
          </span>
        </div>
        <div className="relative p-4 sm:p-5">
          <Avatar name={c.name} src={c.photos?.[0]} className="absolute -top-8 left-4 size-14 border-4 border-surface text-base sm:left-5" />
          <div className="pt-6">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-tight">{c.name}</h3>
              <Rating value={c.ratingAvg} count={c.ratingCount} />
            </div>
            <p className="mt-0.5 text-sm text-muted">{[c.city, c.homeType].filter(Boolean).join(" · ")}</p>
            <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted">{c.bio}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {c.acceptedPetTypes.map((t) => <span key={t} className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">{emojiFor(t)} {t}</span>)}
              {c.hasGarden && <span className="rounded-full bg-success-50 px-2.5 py-1 text-xs font-medium text-success-700">🌳 Garden</span>}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

export function CaretakerGridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => <div key={i} className="h-96 animate-shimmer rounded-2xl bg-[linear-gradient(90deg,var(--surface-muted)_25%,var(--border)_50%,var(--surface-muted)_75%)] bg-[length:200%_100%]" />)}
    </div>
  );
}
