2026-04-03 09:14 UTC  Deploy of checkout-api 2.8.0 starts.
2026-04-03 09:16 UTC  Error rate on POST /v1/checkout climbs. Card charges succeed, order records do not.
2026-04-03 09:21 UTC  Pager fires. On-call is Priya Raman.
2026-04-03 09:28 UTC  Rollback of checkout-api to 2.7.4 begins.
2026-04-03 09:36 UTC  Error rate normal. Checkout unavailable to customers for 22 minutes.
2026-04-03 11:05 UTC  Cause agreed: a migration renamed orders.currency and the new build read the old column.
Impact: 1,840 failed checkouts. Charges voided by 12:40 UTC. No duplicate capture found.
