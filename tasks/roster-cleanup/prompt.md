Clean the roster into a JSON array of `{ name, email, title, location, startDate }`. Preserve the order of the real people.

Rules:
- Drop empty rows and any row whose name is TOTAL, in any case.
- A name written "Last, First" becomes "First Last". Otherwise trim the name.
- Lowercase and trim the email.
- Trim title and location.
- startDate is YYYY-MM-DD. Accept M/D/YY, YYYY-MM-DD, and D-Mon-YYYY with a three-letter English month. Two-digit years 00 through 69 are 2000 through 2069.

The fixture is the whole input.
