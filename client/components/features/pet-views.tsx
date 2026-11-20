"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Query } from "@/components/ui/feedback";
import { EmptyState, PetAvatar } from "@/components/ui/misc";
import { api, fileUrl } from "@/lib/api";
import { formatDateTime, petTypeLabel } from "@/lib/format";
import { useAction, useGet } from "@/lib/hooks";
import type { Pet } from "@/lib/types";
import { PetForm } from "./pet-form";

export function PetList() {
  const q = useGet<Pet[]>("/pets/mine", ["pets"]);
  return (
    <Query q={q}>
      {(pets) => pets.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((p) => (
            <li key={p._id}>
              <Link href={`/owner/pets/${p._id}`} className="block h-full">
                <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-pop">
                  <CardBody className="flex items-center gap-4">
                    <PetAvatar type={p.type} photo={p.photos[0]} />
                    <div className="min-w-0">
                      <p className="font-semibold">{p.name}</p>
                      <p className="truncate text-sm text-muted">{[p.breed, p.age].filter(Boolean).join(" · ") || petTypeLabel(p.type, p.otherType)}</p>
                      <div className="mt-1.5">{p.vaccinationDocs.length ? <Badge tone="success">Vaccination uploaded</Badge> : <Badge tone="warning">Certificate needed</Badge>}</div>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon="🐶" title="No pets yet" text="Add your pet's profile to start booking." action={<ButtonLink href="/owner/pets/new">Add a pet</ButtonLink>} />}
    </Query>
  );
}

type Change = { _id: string; createdAt: string; changes: Record<string, unknown> };

export function EditPet() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const q = useGet<Pet>(`/pets/${id}`, ["pet", id]);
  const history = useGet<Change[]>(`/pets/${id}/history`, ["pet", id, "history"]);
  const remove = useAction(() => api(`/pets/${id}`, { method: "DELETE" }), { success: "Pet removed", invalidate: [["pets"]], onSuccess: () => router.push("/owner/pets") });
  return (
    <Query q={q}>
      {(pet) => (
        <div className="space-y-8">
          {!!pet.vaccinationDocs.length && (
            <Card><CardBody>
              <h2 className="font-semibold">Vaccination documents</h2>
              <ul className="mt-2 space-y-1 text-sm">{pet.vaccinationDocs.map((d, i) => <li key={d}><a className="text-primary underline" href={fileUrl(d)} target="_blank" rel="noreferrer">Certificate {i + 1}</a></li>)}</ul>
            </CardBody></Card>
          )}
          <PetForm pet={pet} />
          <Card className="max-w-3xl"><CardBody>
            <h2 className="font-semibold">Change history</h2>
            <Query q={history} skeleton={<p className="mt-2 text-sm text-muted">Loading…</p>}>
              {(h) => h.length ? <ul className="mt-3 space-y-2 text-sm">{h.map((c) => <li key={c._id} className="flex justify-between gap-3"><span>Changed {Object.keys(c.changes).join(", ")}</span><span className="text-muted">{formatDateTime(c.createdAt)}</span></li>)}</ul> : <p className="mt-2 text-sm text-muted">No changes yet.</p>}
            </Query>
          </CardBody></Card>
          <Button variant="danger" loading={remove.isPending} onClick={() => confirm(`Remove ${pet.name}?`) && remove.mutate()}>Remove pet</Button>
        </div>
      )}
    </Query>
  );
}
