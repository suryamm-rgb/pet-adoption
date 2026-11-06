import type { Metadata } from "next";
import { SellerProducts } from "@/components/features/seller-views";

export const metadata: Metadata = { title: "Products" };

// These areas depend on the logged-in session, which is only known in the browser, so they may block.
export const instant = false;

export default function Page() {
  return <SellerProducts />;
}
