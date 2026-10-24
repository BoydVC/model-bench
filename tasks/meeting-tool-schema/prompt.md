We are adding one tool to the scheduling agent. Describe it as a single JSON object.

- `name` is `propose_meeting`.
- `description` is one or two sentences, at least 40 characters, and it must say the tool proposes a hold and does not send invites.
- `parameters` is a JSON Schema object with `type` "object" and `additionalProperties` false.
- `required` includes title, attendees, start, end, and timezone. No other field is required.
- properties: title (string), attendees (array of strings, the emails), start (string, date-time), end (string, date-time), timezone (string, IANA name), notes (optional string).
