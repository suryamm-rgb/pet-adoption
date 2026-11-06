"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-muted";
const field = "h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted focus-visible:border-ring";

export function HeroSearch() {
  const router = useRouter();
  return (
    <form
      className="grid gap-3 rounded-2xl border border-border bg-surface p-3 shadow-pop sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto] lg:items-end lg:p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        const q = new URLSearchParams();
        for (const k of ["city", "from", "to", "petType"]) {
          const v = String(d.get(k) ?? "").trim();
          if (v) q.set(k, v);
        }
        router.push(`/caretakers?${q}`);
      }}
      aria-label="Search caretakers"
    >
      <div><label htmlFor="hs-city" className={label}>Where</label><input id="hs-city" name="city" placeholder="City, e.g. Bengaluru" className={field} /></div>
      <div><label htmlFor="hs-from" className={label}>From</label><input id="hs-from" name="from" type="date" className={field} /></div>
      <div><label htmlFor="hs-to" className={label}>To</label><input id="hs-to" name="to" type="date" className={field} /></div>
      <div>
        <label htmlFor="hs-type" className={label}>Pet</label>
        <select id="hs-type" name="petType" className={field} defaultValue="">
          <option value="">Any pet</option><option>Dog</option><option>Cat</option><option>Rabbit</option><option>Bird</option>
        </select>
      </div>
      <Button type="submit" variant="accent" size="lg" className="sm:col-span-2 lg:col-span-1 lg:h-11">Search</Button>
    </form>
  );
}
