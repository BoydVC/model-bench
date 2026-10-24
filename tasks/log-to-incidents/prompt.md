Turn the JSONL log into JSON `{ "incidents": [ { "trace", "service", "firstSeen", "count", "sample" } ] }`.

Use lines whose level is error. Group them by trace. service, firstSeen, and sample come from the earliest error in the group. count is the number of error lines in the group. Sort incidents by trace. Omit traces that have no error line.
