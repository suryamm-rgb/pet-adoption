# 8. Pet shop, orders and tracking

[← Buying a pet](07-buying-a-pet.md) · [Notifications and email →](09-notifications-and-email.md)

**Who:** owner, seller, admin

`/shop` → cart in the browser → `POST /cart` (server prices it) → `/shop/cart` checkout with a delivery address: `POST /orders` (`PENDING_PAYMENT`) → `POST /payments/shop/:orderId` → payment captured → `PLACED`, stock reduced. Sold-out products show "Sold out" and cannot be added.

Fulfilment: the **seller** (`/seller/orders`, only orders containing their own products) or an admin moves it `PACKED → SHIPPED → DELIVERED` (steps cannot be skipped). A seller cannot touch another seller's order.

**Order tracking.** Every status change is stored with its time (`statusHistory`). Marking an order **Shipped** opens a dialog asking for the **courier and tracking number** (both required, enforced by the API). The buyer is notified (and emailed) at Packed, Shipped (with courier and number) and Delivered. On `/owner/orders` each order shows a four-step tracker (Placed, Packed, Shipped, Delivered) with timestamps, and the courier and tracking number with a Copy button once shipped.

**Cancelling**: `PATCH /orders/:id/cancel`. The buyer can cancel while `PENDING_PAYMENT` or `PLACED` (before it is packed) from `/owner/orders`. A seller or admin can cancel a `PLACED` order with a reason. A paid order is **refunded in full** (recorded on the payment) and the stock is added back; the buyer is notified when the seller cancels.
