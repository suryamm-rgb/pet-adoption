export type Role = "owner" | "caretaker" | "seller" | "admin";
export type User = { id: string; name: string; email: string; phone?: string; city?: string; roles: Role[]; emailVerified: boolean; phoneVerified?: boolean; notifyPrefs?: { email: boolean; push: boolean; whatsapp: boolean } };

export type BookingStatus =
  | "REQUESTED" | "ACCEPTED" | "PAID" | "IN_CARE" | "COMPLETED"
  | "REJECTED" | "EXPIRED" | "CANCELLED" | "DISPUTED" | "REFUNDED";

export type Pet = {
  _id: string; name: string; type: string; otherType?: string; breed?: string; age?: string; gender?: string; weight?: number;
  photos: string[]; vaccinationDocs: string[]; allergies?: string; medications?: { name: string; dose?: string; time?: string }[]; vetName?: string; vetPhone?: string;
  food?: { type?: string; schedule?: string }; routine?: string; sleepingPlace?: string; behaviourNotes?: string;
  goodWithKids?: boolean; goodWithPets?: boolean;
  emergencyContact?: { name?: string; phone?: string }; backupContact?: { name?: string; phone?: string };
};

export type Caretaker = {
  id: string; name: string; city?: string; bio?: string; pricePerDay: number; maxPets: number; acceptedPetTypes: string[];
  homeType?: string; hasGarden?: boolean; experienceYears?: number; photos: string[]; ratingAvg: number; ratingCount: number; verified: boolean;
};

export type CaretakerProfile = Omit<Caretaker, "id" | "name" | "verified"> & {
  userId: string; address?: string; idProofUrl?: string; addressProofUrl?: string;
  verificationStatus: "draft" | "pending" | "approved" | "rejected"; rejectionReason?: string;
  bankDetails?: { accountName?: string; accountNumber?: string; ifsc?: string }; blockedDates?: string[];
  payoutAccountStatus?: "none" | "created" | "activated" | "needs_clarification" | "rejected"; payoutAccountNote?: string;
};

type Ref = { _id: string; name: string; phone?: string };
export type Booking = {
  _id: string; ownerId: Ref | string; caretakerId: Ref | string; petId: (Pet & { name: string }) | string;
  petSnapshot?: Pet; startDate: string; endDate: string; days: number; pricePerDay: number;
  careAmount: number; platformFee: number; ownerPays: number; caretakerGets: number; status: BookingStatus;
  cancelledBy?: string; cancelReason?: string; refundAmount: number; payoutStatus: "none" | "pending" | "paid"; completedAt?: string;
  instructions: { _id: string; text: string; at: string; acknowledged: boolean }[];
  caretakerAddress?: string; createdAt: string; acceptedAt?: string;
};

export type DailyUpdate = { _id: string; note: string; photos: string[]; createdAt: string };
export type Message = { _id: string; senderId: string; receiverId?: string; text: string; createdAt: string };
export type Review = { _id: string; rating: number; comment?: string; createdAt: string; fromUserId: Ref | string; toUserId: Ref | string; bookingId: string; reply?: { text: string; at: string }; hidden?: boolean };
export type Notification = { _id: string; type: string; title: string; body?: string; link?: string; readAt?: string; createdAt: string };

export type Listing = {
  _id: string; sellerId: string; title: string; petType?: string; otherPetType?: string; mode: "adopt" | "sell"; price: number; description?: string;
  photos: string[]; city?: string; status: "pending" | "approved" | "rejected" | "reserved" | "closed"; buyerId?: string;
};
export type AdoptionRequest = { _id: string; listingId: Listing | string; adopterId: Ref | string; message?: string; status: "pending" | "approved" | "rejected" | "completed"; createdAt: string };
export type Product = { _id: string; sellerId?: string; name: string; category?: string; price: number; stock: number; images: string[]; description?: string; isActive: boolean };
export type Order = { _id: string; items: { productId: string; name: string; qty: number; price: number }[]; total: number; address: string; status: string; createdAt: string; cancelReason?: string; refundAmount?: number;
  statusHistory?: { status: string; at: string }[]; shipment?: { courier?: string; trackingNumber?: string; shippedAt?: string } };
export type Report = { _id: string; targetType: string; targetId: string; reason: string; details?: string; status: "open" | "actioned" | "dismissed"; createdAt: string; reporterId: { name: string; email: string } };
export type AuditEntry = { _id: string; action: string; target: string; createdAt: string; adminId?: { name: string }; meta?: unknown };

export type Payment = { _id: string; bookingId?: string; type: string; amount: number; status: string; razorpayOrderId?: string; refunds: { id: string; amount: number }[]; createdAt: string };
export type Settings = {
  platformFeePercent: number; caretakerCommissionPercent: number; cancellationRules: { hoursBefore: number; refundPercent: number }[];
  paymentDeadlineHours: number; requestExpiryHours: number; disputeWindowHours: number; allowedPetTypes: string[];
  features?: { googleClientId: string | null; pushPublicKey: string | null; sms: boolean; whatsapp: boolean; phoneVerificationRequired: boolean; payoutMode: "manual" | "route" };
};
export type CheckIn = { _id: string; kind: "walk" | "vet" | "home" | "other"; lat: number; lng: number; accuracy?: number; note?: string; createdAt: string };
export type Dispute = { _id: string; bookingId: Booking; raisedBy: Ref; reason: string; status: "open" | "resolved"; adminDecision?: string; createdAt: string };

export const idOf = (v: { _id: string } | string) => (typeof v === "string" ? v : v._id);
export const nameOf = (v: { name?: string } | string) => (typeof v === "string" ? "" : (v.name ?? ""));
