"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Checkbox, Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/toast";
import { api, errorText } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import type { Pet } from "@/lib/types";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name"),
  type: z.string().min(1),
  breed: z.string().optional(),
  age: z.string().optional(),
  gender: z.string().optional(),
  weight: z.union([z.coerce.number().min(0).max(200), z.literal("")]).optional(),
  allergies: z.string().optional(),
  medications: z.array(z.object({ name: z.string().min(1, "Name"), dose: z.string().optional(), time: z.string().optional() })),
  vetName: z.string().optional(),
  vetPhone: z.string().optional(),
  foodType: z.string().optional(),
  foodSchedule: z.string().optional(),
  routine: z.string().optional(),
  sleepingPlace: z.string().optional(),
  goodWithKids: z.boolean(),
  goodWithPets: z.boolean(),
  behaviourNotes: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  backupName: z.string().optional(),
  backupPhone: z.string().optional(),
});
type Values = z.input<typeof schema>;

const clean = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined));

function toPayload(v: z.output<typeof schema>) {
  return clean({
    name: v.name, type: v.type, breed: v.breed, age: v.age, gender: v.gender, weight: v.weight === "" ? undefined : v.weight,
    allergies: v.allergies, medications: v.medications, vetName: v.vetName, vetPhone: v.vetPhone,
    food: { type: v.foodType, schedule: v.foodSchedule }, routine: v.routine, sleepingPlace: v.sleepingPlace,
    goodWithKids: v.goodWithKids, goodWithPets: v.goodWithPets, behaviourNotes: v.behaviourNotes,
    emergencyContact: { name: v.emergencyName, phone: v.emergencyPhone }, backupContact: { name: v.backupName, phone: v.backupPhone },
  });
}

function defaults(p?: Pet): Values {
  return {
    name: p?.name ?? "", type: p?.type ?? "Dog", breed: p?.breed ?? "", age: p?.age ?? "", gender: p?.gender ?? "", weight: p?.weight ?? "",
    allergies: p?.allergies ?? "", medications: p?.medications ?? [], vetName: p?.vetName ?? "", vetPhone: p?.vetPhone ?? "",
    foodType: p?.food?.type ?? "", foodSchedule: p?.food?.schedule ?? "", routine: p?.routine ?? "", sleepingPlace: p?.sleepingPlace ?? "",
    goodWithKids: p?.goodWithKids ?? false, goodWithPets: p?.goodWithPets ?? false, behaviourNotes: p?.behaviourNotes ?? "",
    emergencyName: p?.emergencyContact?.name ?? "", emergencyPhone: p?.emergencyContact?.phone ?? "", backupName: p?.backupContact?.name ?? "", backupPhone: p?.backupContact?.phone ?? "",
  };
}

const Group = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <Card><CardBody className="space-y-4"><div><h2 className="font-semibold">{title}</h2>{hint && <p className="text-xs text-muted">{hint}</p>}</div>{children}</CardBody></Card>
);

export function PetForm({ pet }: { pet?: Pet }) {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema), defaultValues: defaults(pet) });
  const meds = useFieldArray({ control, name: "medications" });

  return (
    <form className="max-w-3xl space-y-5" noValidate onSubmit={handleSubmit(async (v) => {
      setError("");
      try {
        const saved = pet ? await api<Pet>(`/pets/${pet._id}`, { method: "PUT", body: toPayload(v) }) : await api<Pet>("/pets", { method: "POST", body: toPayload(v) });
        if (file) { const form = new FormData(); form.append("files", file); await api(`/pets/${saved._id}/vaccination`, { method: "POST", form }); }
        await qc.invalidateQueries({ queryKey: ["pets"] });
        toast("success", pet ? "Pet updated" : "Pet added");
        router.push(pet ? "/owner/pets" : `/owner/pets/${saved._id}`);
      } catch (e) { setError(errorText(e)); }
    })}>
      <FormError message={error} />
      <Group title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" error={errors.name?.message}><Input id="name" aria-invalid={!!errors.name} {...register("name")} /></Field>
          <Field label="Type" htmlFor="type"><Select id="type" {...register("type")}><option>Dog</option><option>Cat</option><option>Rabbit</option><option>Bird</option></Select></Field>
          <Field label="Breed" htmlFor="breed"><Input id="breed" {...register("breed")} /></Field>
          <Field label="Age" htmlFor="age"><Input id="age" placeholder="3 years" {...register("age")} /></Field>
          <Field label="Gender" htmlFor="gender"><Select id="gender" {...register("gender")}><option value="">Not set</option><option>Male</option><option>Female</option></Select></Field>
          <Field label="Weight (kg)" htmlFor="weight"><Input id="weight" type="number" step="0.1" min="0" {...register("weight")} /></Field>
        </div>
      </Group>
      <Group title="Health" hint="A vaccination certificate is required before a booking can be confirmed.">
        <Field label={pet ? "Add vaccination certificate" : "Vaccination certificate"} htmlFor="vax" hint="PDF, JPG, PNG or WEBP up to 5 MB"><Input id="vax" type="file" accept="application/pdf,image/*" className="py-1.5" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
        <Field label="Allergies" htmlFor="allergies"><Textarea id="allergies" {...register("allergies")} /></Field>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><p className="text-sm font-medium">Medications</p><Button size="sm" variant="secondary" onClick={() => meds.append({ name: "", dose: "", time: "" })}>Add medicine</Button></div>
          {meds.fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
              <Input aria-label="Medicine name" placeholder="Name" {...register(`medications.${i}.name`)} />
              <Input aria-label="Dose" placeholder="Dose" {...register(`medications.${i}.dose`)} />
              <Input aria-label="Time" placeholder="8 am" {...register(`medications.${i}.time`)} />
              <Button variant="ghost" aria-label="Remove medicine" onClick={() => meds.remove(i)}>✕</Button>
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vet name" htmlFor="vetName"><Input id="vetName" {...register("vetName")} /></Field>
          <Field label="Vet phone" htmlFor="vetPhone"><Input id="vetPhone" type="tel" {...register("vetPhone")} /></Field>
        </div>
      </Group>
      <Group title="Care routine">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Food type" htmlFor="foodType"><Input id="foodType" {...register("foodType")} /></Field>
          <Field label="Feeding schedule" htmlFor="foodSchedule"><Input id="foodSchedule" placeholder="8 am and 7 pm" {...register("foodSchedule")} /></Field>
          <Field label="Sleeping place" htmlFor="sleep"><Input id="sleep" {...register("sleepingPlace")} /></Field>
        </div>
        <Field label="Walk and play routine" htmlFor="routine"><Textarea id="routine" {...register("routine")} /></Field>
      </Group>
      <Group title="Behaviour">
        <div className="flex flex-wrap gap-6"><Checkbox label="Good with kids" {...register("goodWithKids")} /><Checkbox label="Good with other pets" {...register("goodWithPets")} /></div>
        <Field label="Notes (fears, biting history, commands)" htmlFor="beh"><Textarea id="beh" {...register("behaviourNotes")} /></Field>
      </Group>
      <Group title="Emergency contacts while travelling">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" htmlFor="en"><Input id="en" {...register("emergencyName")} /></Field>
          <Field label="Your phone" htmlFor="ep"><Input id="ep" type="tel" {...register("emergencyPhone")} /></Field>
          <Field label="Backup contact name" htmlFor="bn"><Input id="bn" {...register("backupName")} /></Field>
          <Field label="Backup contact phone" htmlFor="bp"><Input id="bp" type="tel" {...register("backupPhone")} /></Field>
        </div>
      </Group>
      <div className="flex gap-3"><Button type="submit" loading={isSubmitting}>{pet ? "Save changes" : "Save pet"}</Button><ButtonLink href="/owner/pets" variant="secondary">Cancel</ButtonLink></div>
    </form>
  );
}
