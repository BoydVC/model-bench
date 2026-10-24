Label every request. Return JSON `{ "labels": { "<id>": "<label>" } }` with one of: access, incident, data, vendor, other.

Definitions:
- access: accounts, permissions, or a person who cannot sign in.
- incident: production is hurting customers right now.
- data: a data pull, or a change to a data store.
- vendor: a third party, a contract, a questionnaire, or a renewal.
- other: anything else, including office logistics.

A person locked out of Okta is access, even if they cannot page. A read replica is data. Printer toner is other. A security questionnaire from a vendor is vendor.
