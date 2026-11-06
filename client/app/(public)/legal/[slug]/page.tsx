import type { Metadata } from "next";
import { notFound } from "next/navigation";

const pages: Record<string, { title: string; sections: [string, string][] }> = {
  terms: {
    title: "Terms and conditions",
    sections: [
      ["Using PawStay", "PawStay connects pet owners with independent caretakers. Caretakers are not employees of PawStay. You must provide accurate information and be at least 18."],
      ["Bookings and payments", "Payment is taken online and held by PawStay. It is released to the caretaker after your pet is returned and the dispute window has passed. A platform fee is added to every booking."],
      ["Conduct", "No cruelty, neglect or misleading listings. We may block accounts that break these rules."],
    ],
  },
  privacy: {
    title: "Privacy policy",
    sections: [
      ["What we collect", "Account details, pet profiles, vaccination documents, caretaker ID and address proofs, messages and payment references."],
      ["How we protect it", "Passwords are hashed, ID documents are only visible to admins, and exact addresses are shown only after a booking is paid."],
      ["Your rights", "You can ask us to export or delete your data when it is no longer needed for a booking or legal record."],
    ],
  },
  refunds: {
    title: "Refund policy",
    sections: [
      ["Owner cancels", "48 or more hours before the start: 100% refund including the fee. 24 to 48 hours: 50% of the care amount. Under 24 hours or after the stay starts: no refund, although an admin may refund unused days."],
      ["Caretaker cancels", "You always receive a 100% refund and we help you find another caretaker."],
      ["Disputes", "If something goes wrong, raise a dispute. Payout is frozen and an admin decides on a full payout, partial refund or full refund."],
    ],
  },
  "care-agreement": {
    title: "Care agreement",
    sections: [
      ["Owner duties", "Share accurate health, behaviour and emergency details, and upload a valid vaccination certificate before every booking."],
      ["Caretaker duties", "Care for the pet as agreed, post at least one photo update every day, and use the emergency button if anything is wrong."],
      ["Emergencies", "The caretaker will contact the listed vet and the owner. Reasonable emergency costs are the owner's responsibility."],
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: pages[slug]?.title ?? "Legal" };
}

export default async function LegalPage({ params }: PageProps<"/legal/[slug]">) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
      <p className="mt-2 text-sm text-muted">Summary for the product. Have a lawyer review the final text before launch.</p>
      {page.sections.map(([h, body]) => (
        <section key={h} className="mt-8"><h2 className="text-lg font-semibold">{h}</h2><p className="mt-2 text-muted">{body}</p></section>
      ))}
    </article>
  );
}
