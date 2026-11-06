import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Table, Td, Th } from "@/components/ui/table";
import { formatDate, formatPaise } from "@/lib/format";
import { nameOf, type Booking } from "@/lib/types";

type Viewer = "owner" | "caretaker" | "admin";

function rowData(b: Booking, viewer: Viewer, base: string) {
  return {
    id: b._id,
    pet: nameOf(b.petId),
    other: viewer === "owner" ? nameOf(b.caretakerId) : viewer === "caretaker" ? nameOf(b.ownerId) : `${nameOf(b.ownerId)} → ${nameOf(b.caretakerId)}`,
    dates: `${formatDate(b.startDate)} – ${formatDate(b.endDate)}`,
    total: formatPaise(viewer === "caretaker" ? b.caretakerGets : b.ownerPays),
    href: `${base}/${b._id}`,
    status: b.status,
  };
}

export function BookingTable({ rows, viewer, base, empty }: { rows: Booking[]; viewer: Viewer; base: string; empty?: React.ReactNode }) {
  if (!rows.length) return <>{empty ?? <EmptyState icon="📅" title="No bookings yet" />}</>;
  const data = rows.map((b) => rowData(b, viewer, base));
  const otherLabel = viewer === "owner" ? "Caretaker" : viewer === "caretaker" ? "Owner" : "Owner → Caretaker";
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <thead><tr><Th>Pet</Th><Th>{otherLabel}</Th><Th>Dates</Th><Th>{viewer === "caretaker" ? "You earn" : "Total"}</Th><Th>Status</Th><Th><span className="sr-only">Open</span></Th></tr></thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-surface-muted/60">
                <Td className="font-medium">{r.pet}</Td><Td>{r.other}</Td><Td className="whitespace-nowrap">{r.dates}</Td><Td>{r.total}</Td>
                <Td><StatusBadge status={r.status} /></Td>
                <Td><Link href={r.href} className="font-medium text-primary hover:underline">Open</Link></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <ul className="space-y-3 md:hidden">
        {data.map((r) => (
          <li key={r.id}>
            <Link href={r.href} className="block">
              <Card><CardBody className="space-y-1.5">
                <div className="flex items-start justify-between gap-2"><p className="font-semibold">{r.pet}</p><StatusBadge status={r.status} /></div>
                <p className="text-sm text-muted">{r.other}</p>
                <div className="flex justify-between text-sm"><span>{r.dates}</span><span className="font-medium">{r.total}</span></div>
              </CardBody></Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
