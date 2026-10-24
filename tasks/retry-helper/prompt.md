The platform team keeps reimplementing retries inside agent tools. Write a JavaScript function `retry(fn, options)` on `module.exports.retry`.

`options.attempts` is the maximum number of calls, and it is at least 1. `options.sleep` is an async function the tests inject. Call it with the attempt number that just failed (1 after the first failure) between attempts. Do not call `setTimeout`.

Behavior:
- Return the first resolved value.
- If every attempt throws, throw that last error. Do not wrap it in a new Error.
- Do not sleep after the final failure, and do not sleep when the first attempt succeeds.
