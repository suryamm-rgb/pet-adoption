import { api } from "./api";

type Checkout = { paymentId: string; razorpayOrderId: string; amount: number; currency: string; keyId: string };

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: () => void) => void };
  }
}

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Razorpay"));
    document.body.appendChild(s);
  });
}

/**
 * Opens Razorpay Checkout. With no keys configured the API runs in mock mode (keyId "rzp_mock"),
 * where checkout is simulated by the server. Resolves true when payment was captured.
 */
export async function payWithRazorpay(checkout: Checkout, prefill: { name: string; email: string }): Promise<boolean> {
  if (checkout.keyId === "rzp_mock") {
    if (!window.confirm(`Test mode: pay ₹${checkout.amount / 100} with a simulated payment?`)) return false;
    await api("/payments/mock-complete", { method: "POST", body: { razorpayOrderId: checkout.razorpayOrderId } });
    return true;
  }
  await loadScript();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: checkout.keyId,
      order_id: checkout.razorpayOrderId,
      amount: checkout.amount,
      currency: checkout.currency,
      name: "PawStay",
      prefill,
      theme: { color: "#237f76" },
      handler: async (r: Record<string, string>) => {
        try {
          await api("/payments/verify", { method: "POST", body: r });
          resolve(true);
        } catch (e) {
          reject(e);
        }
      },
      modal: { ondismiss: () => resolve(false) },
    });
    rzp.on("payment.failed", () => resolve(false));
    rzp.open();
  });
}
