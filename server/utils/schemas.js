import { z } from "zod";

const oid = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");
const date = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");
const paise = z.coerce.number().int().min(0).max(100_000_000);
const phone = z.string().trim().min(7).max(20);
const contact = z.object({ name: z.string().max(80).optional(), phone: z.string().max(20).optional() });

export const auth = {
  register: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email(),
    phone: phone.optional(),
    password: z.string().min(8).max(100),
    role: z.enum(["owner", "caretaker"]).default("owner"),
    city: z.string().trim().max(80).optional(),
  }),
  login: z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) }),
  token: z.object({ token: z.string().min(10) }),
  forgot: z.object({ email: z.string().trim().toLowerCase().email() }),
  reset: z.object({ token: z.string().min(10), password: z.string().min(8).max(100) }),
  role: z.object({ role: z.enum(["owner", "caretaker", "seller"]) }),
};

export const pet = {
  body: z.object({
    name: z.string().trim().min(1).max(60),
    type: z.string().trim().min(1).max(30),
    breed: z.string().max(60).optional(),
    age: z.string().max(30).optional(),
    gender: z.string().max(20).optional(),
    weight: z.coerce.number().min(0).max(200).optional(),
    allergies: z.string().max(500).optional(),
    medications: z.array(z.object({ name: z.string(), dose: z.string().optional(), time: z.string().optional() })).max(10).optional(),
    vetName: z.string().max(80).optional(),
    vetPhone: z.string().max(20).optional(),
    food: z.object({ type: z.string().max(60).optional(), schedule: z.string().max(200).optional() }).optional(),
    routine: z.string().max(500).optional(),
    sleepingPlace: z.string().max(200).optional(),
    behaviourNotes: z.string().max(500).optional(),
    goodWithKids: z.boolean().optional(),
    goodWithPets: z.boolean().optional(),
    emergencyContact: contact.optional(),
    backupContact: contact.optional(),
  }),
};
pet.update = pet.body.partial();

export const caretaker = {
  profile: z.object({
    bio: z.string().max(1000).optional(),
    city: z.string().max(80).optional(),
    pricePerDay: paise.optional(),
    maxPets: z.coerce.number().int().min(1).max(10).optional(),
    acceptedPetTypes: z.array(z.string().max(30)).max(10).optional(),
    homeType: z.string().max(60).optional(),
    hasGarden: z.boolean().optional(),
    experienceYears: z.coerce.number().min(0).max(60).optional(),
    address: z.string().max(300).optional(),
  }),
  search: z.object({
    city: z.string().max(80).optional(),
    from: date.optional(),
    to: date.optional(),
    petType: z.string().max(30).optional(),
    maxPrice: z.coerce.number().int().positive().optional(),
    near: z.string().max(60).optional(),
  }),
};

export const booking = {
  create: z.object({ caretakerId: oid, petId: oid, startDate: date, endDate: date }),
  cancel: z.object({ reason: z.string().max(300).optional() }),
  instruction: z.object({ text: z.string().trim().min(1).max(500) }),
};

export const payment = {
  order: z.object({ bookingId: oid }),
  verify: z.object({ razorpay_order_id: z.string(), razorpay_payment_id: z.string(), razorpay_signature: z.string() }),
};

export const social = {
  update: z.object({ note: z.string().trim().min(1).max(1000) }),
  message: z.object({ text: z.string().trim().min(1).max(2000), to: oid.optional() }),
  review: z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().max(1000).optional() }),
  dispute: z.object({ reason: z.string().trim().min(5).max(1000) }),
};

export const listing = {
  create: z.object({
    title: z.string().trim().min(3).max(120),
    petId: oid.optional(),
    petType: z.string().max(30).optional(),
    mode: z.enum(["adopt", "sell"]),
    price: paise.default(0),
    description: z.string().max(2000).optional(),
    city: z.string().max(80).optional(),
  }),
  query: z.object({ mode: z.enum(["adopt", "sell"]).optional(), city: z.string().optional(), petType: z.string().optional() }),
  request: z.object({ message: z.string().max(1000).optional() }),
  status: z.object({ status: z.enum(["approved", "rejected", "completed"]) }),
};

export const shop = {
  product: z.object({
    name: z.string().trim().min(2).max(120),
    category: z.string().max(60).optional(),
    price: paise,
    stock: z.coerce.number().int().min(0).default(0),
    description: z.string().max(2000).optional(),
    isActive: z.boolean().optional(),
  }),
  cart: z.object({ items: z.array(z.object({ productId: oid, qty: z.coerce.number().int().min(1).max(20) })).min(1).max(30) }),
  order: z.object({
    items: z.array(z.object({ productId: oid, qty: z.coerce.number().int().min(1).max(20) })).min(1).max(30),
    address: z.string().trim().min(10).max(400),
  }),
  orderStatus: z.object({ status: z.enum(["PACKED", "SHIPPED", "DELIVERED", "CANCELLED"]) }),
};

export const admin = {
  verify: z.object({ decision: z.enum(["approve", "reject"]), reason: z.string().max(300).optional() }).refine((v) => v.decision === "approve" || v.reason, "Reason required when rejecting"),
  resolve: z.object({
    decision: z.enum(["full_payout", "partial", "full_refund"]),
    amountToOwner: paise.optional(),
    amountToCaretaker: paise.optional(),
    note: z.string().max(500).optional(),
  }),
  settings: z.object({
    platformFeePercent: z.coerce.number().min(0).max(50).optional(),
    caretakerCommissionPercent: z.coerce.number().min(0).max(50).optional(),
    cancellationRules: z.array(z.object({ hoursBefore: z.number().min(0), refundPercent: z.number().min(0).max(100) })).optional(),
    paymentDeadlineHours: z.coerce.number().min(1).max(72).optional(),
    requestExpiryHours: z.coerce.number().min(1).max(168).optional(),
    disputeWindowHours: z.coerce.number().min(0).max(240).optional(),
    allowedPetTypes: z.array(z.string()).optional(),
  }),
  block: z.object({ blocked: z.boolean() }),
  payout: z.object({ force: z.boolean().optional() }),
};
