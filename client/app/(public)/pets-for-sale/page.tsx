import type { Metadata } from "next";
import { ListingGrid } from "@/components/features/listing-views";
import { PublicHero } from "@/components/ui/misc";
import { photo } from "@/lib/images";

export const metadata: Metadata = { title: "Pets for sale" };

export default function Page() {
  return (
    <>
      <PublicHero title="Pets for sale" description="Admin-approved sellers. Payment is held until you confirm handover." image={photo("golden", 640, 480)} />
      <div className="mx-auto max-w-page px-4 py-10">
        <ListingGrid mode="sell" />
      </div>
    </>
  );
}
