# 19. Booking status reference

[← Going live](18-going-live.md) · [Flows index →](README.md)

**Who:** reference

| From | Event | To |
|---|---|---|
| REQUESTED | caretaker accepts | ACCEPTED |
| REQUESTED | caretaker rejects | REJECTED |
| REQUESTED | 24 h timeout | EXPIRED |
| ACCEPTED | payment captured | PAID |
| ACCEPTED | 12 h timeout, or cancel | CANCELLED |
| PAID | start date reached | IN_CARE |
| PAID | cancel | CANCELLED (refund by policy) |
| IN_CARE | owner confirms return, or auto 24 h after end | COMPLETED |
| IN_CARE or COMPLETED (in window) | dispute raised | DISPUTED |
| DISPUTED | admin decision | COMPLETED or REFUNDED |
