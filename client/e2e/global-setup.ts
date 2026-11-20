import { request, type APIRequestContext } from "@playwright/test";
import { API } from "../playwright.config";
import { LISTING_TITLE, PASSWORD, users } from "./world";

// 1x1 transparent PNG, enough to satisfy the upload rules.
export const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

export async function client(): Promise<APIRequestContext> {
  return request.newContext({ baseURL: API.replace(/\/api$/, "") });
}
const post = async (c: APIRequestContext, path: string, data?: unknown) => {
  const r = await c.post(`/api${path}`, { data });
  if (!r.ok()) throw new Error(`POST ${path} -> ${r.status()} ${await r.text()}`);
  return r.json();
};

/** Creates the admin first (the first account on an empty database becomes admin), then everyone else. */
export default async function globalSetup() {
  const admin = await client();
  await post(admin, "/auth/register", { ...users.admin, password: PASSWORD });

  const caretaker = await client();
  const { user: care } = await post(caretaker, "/auth/register", { ...users.caretaker, password: PASSWORD, role: "caretaker", city: "Pune" });
  const put = await caretaker.put("/api/caretakers/me/profile", { data: { bio: "Calm home with a garden, 6 years caring for dogs.", city: "Pune", pricePerDay: 50000, maxPets: 2, acceptedPetTypes: ["Dog"], homeType: "House with garden", address: "12 Garden Road, Pune 411001" } });
  if (!put.ok()) throw new Error(`profile ${await put.text()}`);
  for (const kind of ["idProof", "addressProof"]) {
    const up = await caretaker.post(`/api/caretakers/me/documents/${kind}`, { multipart: { files: { name: "doc.png", mimeType: "image/png", buffer: PNG } } });
    if (!up.ok()) throw new Error(`${kind} ${await up.text()}`);
  }
  await post(caretaker, "/caretakers/me/submit");
  const ok = await admin.patch(`/api/admin/caretakers/${care.id}/verify`, { data: { decision: "approve" } });
  if (!ok.ok()) throw new Error(`verify ${await ok.text()}`);

  await post(await client(), "/auth/register", { ...users.owner, password: PASSWORD });
  await post(await client(), "/auth/register", { ...users.visitor, password: PASSWORD });

  const seller = await client();
  await post(seller, "/auth/register", { ...users.seller, password: PASSWORD });
  await post(seller, "/auth/roles", { role: "seller" });
  const listing = await post(seller, "/listings", { title: LISTING_TITLE, mode: "adopt", petType: "Dog", city: "Pune", description: "Vaccinated, gentle and house trained." });
  const approved = await admin.patch(`/api/admin/listings/${listing._id}/approve`);
  if (!approved.ok()) throw new Error(`approve ${await approved.text()}`);
  process.env.E2E_LISTING_ID = listing._id;
}
