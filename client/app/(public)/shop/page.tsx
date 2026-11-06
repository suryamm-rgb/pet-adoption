import type { Metadata } from "next";
import { ProductGrid } from "@/components/features/shop-views";
import { PublicHero } from "@/components/ui/misc";
import { photo } from "@/lib/images";

export const metadata: Metadata = { title: "Pet shop" };

export default function Page() {
  return (
    <>
      <PublicHero title="Pet shop" description="Food, toys and accessories for every pet." image={photo("food", 640, 480)} />
      <div className="mx-auto max-w-page px-4 py-10">
        <ProductGrid />
      </div>
    </>
  );
}
