import type { Metadata } from "next";
import { MyOrders } from "@/components/features/shop-views";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Shop orders" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function Page() {
  return (
    <>
      <PageHeader title="Shop orders" description="Status of your pet supply orders." />
      <MyOrders />
    </>
  );
}
