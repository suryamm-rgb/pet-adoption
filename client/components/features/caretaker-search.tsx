"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";
import { Query } from "@/components/ui/feedback";
import { useGet } from "@/lib/hooks";
import { rupeesToPaise } from "@/lib/format";
import type { Caretaker } from "@/lib/types";
import { CaretakerCard, CaretakerGridSkeleton } from "./caretaker-card";

const FIELDS = ["city", "from", "to", "petType", "maxPrice", "sort"] as const;

export function CaretakerSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const qs = new URLSearchParams();
  for (const f of FIELDS) {
    const v = params.get(f);
    if (v) qs.set(f, f === "maxPrice" ? String(rupeesToPaise(v)) : v);
  }
  const q = useGet<Caretaker[]>(`/caretakers?${qs}`, ["caretakers", qs.toString()]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const next = new URLSearchParams();
    for (const f of FIELDS) {
      const v = String(data.get(f) ?? "").trim();
      if (v) next.set(f, v);
    }
    router.push(`/caretakers?${next}`);
  }

  return (
    <>
      <Card className="mb-8">
        <CardBody>
          <form key={params.toString()} onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
            <div className="lg:col-span-1"><Field label="City" htmlFor="city"><Input id="city" name="city" defaultValue={params.get("city") ?? ""} placeholder="Bengaluru" /></Field></div>
            <Field label="From" htmlFor="from"><Input id="from" name="from" type="date" defaultValue={params.get("from") ?? ""} /></Field>
            <Field label="To" htmlFor="to"><Input id="to" name="to" type="date" defaultValue={params.get("to") ?? ""} /></Field>
            <Field label="Pet type" htmlFor="petType">
              <Select id="petType" name="petType" defaultValue={params.get("petType") ?? ""}>
                <option value="">Any</option><option>Dog</option><option>Cat</option><option>Rabbit</option><option>Bird</option><option>Other</option>
              </Select>
            </Field>
            <Field label="Sort by" htmlFor="sort">
              <Select id="sort" name="sort" defaultValue={params.get("sort") ?? "rating"}>
                <option value="rating">Top rated</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="newest">Newest</option>
              </Select>
            </Field>
            <Field label="Max price / day (₹)" htmlFor="maxPrice"><Input id="maxPrice" name="maxPrice" type="number" min="0" defaultValue={params.get("maxPrice") ?? ""} placeholder="800" /></Field>
            <Button type="submit">Search</Button>
          </form>
        </CardBody>
      </Card>

      <Query q={q} skeleton={<CaretakerGridSkeleton />}>
        {(list) =>
          list.length ? (
            <>
              <p className="mb-4 text-sm text-muted" aria-live="polite">{list.length} verified caretaker{list.length > 1 ? "s" : ""}</p>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((c) => <li key={c.id}><CaretakerCard c={c} /></li>)}</ul>
            </>
          ) : (
            <EmptyState icon="🔍" title="No caretakers match" text="Try different dates, a nearby city, or remove a filter." />
          )
        }
      </Query>
    </>
  );
}
