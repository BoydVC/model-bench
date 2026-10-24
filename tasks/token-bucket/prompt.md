The agent gateway needs a limiter we can test with a fake clock. Write `module.exports.createLimiter = function createLimiter({ capacity, refillPerSec })`.

It returns `{ allow(nowMs) }`.
- The bucket starts full, with `capacity` tokens.
- `allow` consumes one token and returns true when at least one token is available, otherwise false.
- Tokens refill at `refillPerSec` from the milliseconds since the previous `allow` call, and they never exceed `capacity`.
- A `nowMs` earlier than or equal to the previous call adds no tokens and does not throw.
- Fractional tokens are fine. Do not read the system clock.
