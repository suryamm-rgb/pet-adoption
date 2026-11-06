"use client";

import { EmptyState } from "@/components/ui/misc";
import { Query } from "@/components/ui/feedback";
import { useGet } from "@/lib/hooks";
import type { Caretaker } from "@/lib/types";
import { CaretakerCard, CaretakerGridSkeleton } from "./caretaker-card";

export function FeaturedCaretakers() {
  const q = useGet<Caretaker[]>("/caretakers", ["caretakers", "featured"]);
  return (
    <Query q={q} skeleton={<CaretakerGridSkeleton />}>
      {(list) =>
        list.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.slice(0, 3).map((c) => <li key={c.id}><CaretakerCard c={c} /></li>)}
          </ul>
        ) : (
          <EmptyState title="Caretakers are joining soon" text="Check back shortly." />
        )
      }
    </Query>
  );
}
