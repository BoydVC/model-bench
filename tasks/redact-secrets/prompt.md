Support pastes logs into tickets. Write `module.exports.redact = function redact(text)` and return a copy with secrets masked.

Mask these and nothing else:
- An API key of `sk-` plus 8 or more letters, digits, underscores, or hyphens, replaced with `[REDACTED]`.
- `Bearer <token>` when the token is at least 8 characters, replaced with `Bearer [REDACTED]`.
- An AWS access key id of `AKIA` plus 16 uppercase letters or digits, replaced with `[REDACTED]`.
- A `password=` query value. Keep the key, replace the value with `[REDACTED]`.

Do not change ordinary prose, including the word "password" in a sentence. Do not change email addresses.

The fixture is an example of the mess. Your function has to handle that shape and the cases the harness adds.
