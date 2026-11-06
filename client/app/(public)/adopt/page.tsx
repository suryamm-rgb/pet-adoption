import type { Metadata } from "next";
import { ListingGrid } from "@/components/features/listing-views";
import { PublicHero } from "@/components/ui/misc";
import { photo } from "@/lib/images";

export const metadata: Metadata = { title: "Adopt a pet" };

export default function Page() {
  return (
    <>
      <PublicHero title="Adopt a pet" description="Give a pet a forever home. Every listing is approved by our team." image={photo("beagle", 640, 480)} />
      <div className="mx-auto max-w-page px-4 py-10">
        <ListingGrid mode="adopt" />
      </div>
    </>
  );
}
