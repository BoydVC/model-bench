Dedupe the tickets. Return JSON `{ "keep": string[], "merged": { "<keepId>": string[] } }`.

Normalize a subject by lowercasing it, deleting punctuation, and collapsing whitespace.
Two tickets merge when the requester email matches, the normalized subject matches, and the later createdAt is within 24 hours of the earlier one. Keep the earlier id. Merged maps that id to the ids folded into it. Tickets that merge with nobody appear in keep and not in merged. Sort keep by id. Do not chain across a gap longer than 24 hours.

The fixture is the whole input.
