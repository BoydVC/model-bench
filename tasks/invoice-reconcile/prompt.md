Reconcile the billing export with the card statement. Return JSON:

`{ "matched": [{ "billingId": string, "cardId": string }], "billingOnly": string[], "cardOnly": string[] }`

Normalize a vendor by lowercasing, deleting punctuation, and removing the words inc, llc, incorporated, and co. A pair matches when the normalized vendors are equal, the absolute amount difference is at most $0.50, and the absolute date difference is at most 3 days. Use each row at most once. When more than one pair qualifies, prefer the closer amount, then the closer date. Sort matched by billingId, and sort the only-lists by id.

The fixture has both extracts.
