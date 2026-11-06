import type { Metadata } from "next";
import { CartView } from "@/components/features/shop-views";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-page px-4 py-10">
      <PageHeader title="Your cart" />
      <CartView />
    </div>
  );
}
