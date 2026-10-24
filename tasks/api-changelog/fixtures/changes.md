Since 2026-06-01:
- Added POST /v1/orgs/{id}/tools for registering an agent tool.
- Added idempotency keys on POST /v1/checkout.
- Changed: GET /v1/teams is deprecated and removed on 2026-09-01. Use GET /v2/orgs.
- Changed: webhook signatures moved from SHA1 to SHA256.
- Fixed: retried checkouts double-counted loyalty points.
