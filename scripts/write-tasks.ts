// Seed generator for the starter pack. The files under tasks/ are the source of truth.
// Running this script overwrites those files.
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "tasks");

const codingRubric = [
  { id: "correctness", label: "Correctness", weight: 0.5, prompt: "Does the solution do what the task asked, including the edge cases?" },
  { id: "constraints", label: "Constraints", weight: 0.3, prompt: "Does it follow the output contract and the constraints a test might only partly see?" },
  { id: "clarity", label: "Clarity", weight: 0.2, prompt: "Could a teammate maintain this without a rewrite?" },
];
const writingRubric = [
  { id: "correctness", label: "Fidelity", weight: 0.35, prompt: "Are the facts from the source present, and are invented facts absent?" },
  { id: "constraints", label: "Constraints", weight: 0.4, prompt: "Does it follow the audience, the required sections, and the things it must not say?" },
  { id: "clarity", label: "Clarity", weight: 0.25, prompt: "Would a director forward this without rewriting it?" },
];
const researchRubric = [
  { id: "correctness", label: "Fidelity", weight: 0.45, prompt: "Are the claims grounded in the source, with gaps marked instead of filled in?" },
  { id: "constraints", label: "Constraints", weight: 0.35, prompt: "Does it answer the decision the director actually has to make?" },
  { id: "clarity", label: "Clarity", weight: 0.2, prompt: "Can someone scan this in a few minutes and know what to do?" },
];
const dataRubric = [
  { id: "correctness", label: "Correctness", weight: 0.55, prompt: "Does the structured result follow the cleanup rules?" },
  { id: "constraints", label: "Constraints", weight: 0.3, prompt: "Is the output the requested JSON shape and nothing else?" },
  { id: "clarity", label: "Clarity", weight: 0.15, prompt: "Are the field values unambiguous?" },
];

type TaskFile = {
  id: string;
  title: string;
  category: "coding" | "writing" | "research" | "data";
  order: number;
  summary: string;
  whatWeTest: string[];
  outputHint: string;
  prompt: string;
  fixtures?: { path: string; content: string }[];
  checks: unknown[];
  harness?: boolean;
};

const codeHint = "Reply with one ```js fence that assigns functions on module.exports. No other text.";
const jsonHint = "Reply with one JSON object and no markdown fence.";
const dataHint = "Reply with one ```json fence and no other text.";
const proseHint = "Reply in markdown. Use the headings the task names. Do not add a preamble.";

const tasks: TaskFile[] = [
  {
    id: "retry-helper",
    title: "Retry helper with an injected sleep",
    category: "coding",
    order: 1,
    summary: "Agent tools keep growing their own retry loops. The platform team wants one helper tests can drive without a real timer.",
    whatWeTest: [
      "Returns the first successful value and does not sleep after it.",
      "Retries until success and stops at the attempt limit.",
      "Throws the last error, not a new wrapper.",
      "Passes the failed attempt number to the injected sleep.",
    ],
    outputHint: codeHint,
    harness: true,
    prompt: `The platform team keeps reimplementing retries inside agent tools. Write a JavaScript function \`retry(fn, options)\` on \`module.exports.retry\`.

\`options.attempts\` is the maximum number of calls, and it is at least 1. \`options.sleep\` is an async function the tests inject. Call it with the attempt number that just failed (1 after the first failure) between attempts. Do not call \`setTimeout\`.

Behavior:
- Return the first resolved value.
- If every attempt throws, throw that last error. Do not wrap it in a new Error.
- Do not sleep after the final failure, and do not sleep when the first attempt succeeds.`,
    checks: [{ type: "harness" }],
  },
  {
    id: "redact-secrets",
    title: "Redact secrets in a pasted log",
    category: "coding",
    order: 2,
    summary: "People paste production logs into tickets. The support macro needs a redaction function that does not chew up ordinary sentences.",
    whatWeTest: [
      "Masks sk- API keys, bearer tokens, and AKIA access key ids.",
      "Masks password values in URLs and keeps the password= key.",
      "Leaves the word password in a sentence, and leaves email addresses, alone.",
    ],
    outputHint: codeHint,
    harness: true,
    prompt: `Support pastes logs into tickets. Write \`module.exports.redact = function redact(text)\` and return a copy with secrets masked.

Mask these and nothing else:
- An API key of \`sk-\` plus 8 or more letters, digits, underscores, or hyphens, replaced with \`[REDACTED]\`.
- \`Bearer <token>\` when the token is at least 8 characters, replaced with \`Bearer [REDACTED]\`.
- An AWS access key id of \`AKIA\` plus 16 uppercase letters or digits, replaced with \`[REDACTED]\`.
- A \`password=\` query value. Keep the key, replace the value with \`[REDACTED]\`.

Do not change ordinary prose, including the word "password" in a sentence. Do not change email addresses.

The fixture is an example of the mess. Your function has to handle that shape and the cases the harness adds.`,
    fixtures: [{
      path: "fixtures/log.txt",
      content: `ticket 4412
Authorization: Bearer abcdEFGH1234
vendor key sk-live-abc12345
aws AKIAIOSFODNN7EXAMPLE
callback https://hooks.example.com/cb?password=hunter2&x=1
note: ask Mei to reset your password tomorrow
contact mei.chen@example.com
`,
    }],
    checks: [{ type: "harness" }],
  },
  {
    id: "meeting-tool-schema",
    title: "Tool schema for a scheduling agent",
    category: "coding",
    order: 3,
    summary: "The scheduling agent needs a tool that proposes a hold and does not send the invite itself.",
    whatWeTest: [
      "The tool is named propose_meeting and says it does not send invites.",
      "Parameters are a closed object.",
      "title, attendees, start, end, and timezone are required.",
      "attendees is an array of strings.",
    ],
    outputHint: jsonHint,
    harness: true,
    prompt: `We are adding one tool to the scheduling agent. Describe it as a single JSON object.

- \`name\` is \`propose_meeting\`.
- \`description\` is one or two sentences, at least 40 characters, and it must say the tool proposes a hold and does not send invites.
- \`parameters\` is a JSON Schema object with \`type\` "object" and \`additionalProperties\` false.
- \`required\` includes title, attendees, start, end, and timezone. No other field is required.
- properties: title (string), attendees (array of strings, the emails), start (string, date-time), end (string, date-time), timezone (string, IANA name), notes (optional string).`,
    checks: [{ type: "harness" }],
  },
  {
    id: "csv-row-diff",
    title: "Diff two snapshots of a finance table",
    category: "coding",
    order: 4,
    summary: "Finance exports the same table twice a day. The director wants added, removed, and changed rows, not a wall of cells.",
    whatWeTest: [
      "Added and removed rows are detected by key.",
      "A changed row lists only the fields that differ, as from/to.",
      "The key field and unchanged fields stay out of the change list.",
      "Identical snapshots produce an empty diff.",
    ],
    outputHint: codeHint,
    harness: true,
    prompt: `Finance exports two snapshots of the same table. Write \`module.exports.diffRows = function diffRows(before, after, key)\`.

\`before\` and \`after\` are arrays of flat objects. \`key\` is the id field.

Return \`{ added, removed, changed }\`.
- \`added\`: rows in after whose key is not in before.
- \`removed\`: rows in before whose key is not in after.
- \`changed\`: \`{ key, fields }\` for rows whose other values differ. \`fields\` maps a field name to \`{ from, to }\`. Omit the key field. Omit unchanged fields. Omit rows with no field changes.

The fixture shows the shape. The harness uses its own rows.`,
    fixtures: [{
      path: "fixtures/snapshots.json",
      content: JSON.stringify({
        key: "id",
        before: [{ id: "INV-1", status: "open", owner: "sam" }],
        after: [{ id: "INV-1", status: "paid", owner: "sam" }, { id: "INV-2", status: "open", owner: "mei" }],
      }, null, 2),
    }],
    checks: [{ type: "harness" }],
  },
  {
    id: "token-bucket",
    title: "Token bucket the tests can clock",
    category: "coding",
    order: 5,
    summary: "The agent gateway needs a limiter. Tests pass a fake clock, so the bucket cannot call the real time.",
    whatWeTest: [
      "The bucket starts full and refuses once it is empty.",
      "Tokens refill from elapsed milliseconds and never exceed capacity.",
      "A clock that jumps backwards does not mint tokens.",
    ],
    outputHint: codeHint,
    harness: true,
    prompt: `The agent gateway needs a limiter we can test with a fake clock. Write \`module.exports.createLimiter = function createLimiter({ capacity, refillPerSec })\`.

It returns \`{ allow(nowMs) }\`.
- The bucket starts full, with \`capacity\` tokens.
- \`allow\` consumes one token and returns true when at least one token is available, otherwise false.
- Tokens refill at \`refillPerSec\` from the milliseconds since the previous \`allow\` call, and they never exceed \`capacity\`.
- A \`nowMs\` earlier than or equal to the previous call adds no tokens and does not throw.
- Fractional tokens are fine. Do not read the system clock.`,
    checks: [{ type: "harness" }],
  },
  {
    id: "review-risky-diff",
    title: "Review a small, risky pull request",
    category: "coding",
    order: 6,
    summary: "A director will not read the whole patch. The review has to name the secret in the logs and the SQL concatenation, and ignore the copyright bump.",
    whatWeTest: [
      "The answer is JSON with a findings array.",
      "Logging the vendor key in src/api.ts is a high-severity finding.",
      "Concatenating request input into SQL in src/search.ts is a finding.",
      "The copyright header is not filed as a finding.",
    ],
    outputHint: jsonHint,
    harness: true,
    prompt: `Review this pull request for a director who will not read the patch. Return JSON:

\`{ "findings": [ { "severity": "high" | "medium" | "low", "file": string, "issue": string, "suggestion": string } ] }\`

File a finding only for a real issue.
- Logging a live API key is high severity.
- Building SQL by concatenating request input is high severity.
- Do not file a finding about the copyright header or the comment that says to fix a typo later.

The diff is the fixture.`,
    fixtures: [{
      path: "fixtures/pr.diff",
      content: `diff --git a/src/api.ts b/src/api.ts
@@
-    const key = process.env.VENDOR_KEY;
-    return fetch(url, { headers: { Authorization: \`Bearer \${key}\` } });
+    const key = process.env.VENDOR_KEY;
+    console.log("vendor request", { url, key });
+    return fetch(url, { headers: { Authorization: \`Bearer \${key}\` } });

diff --git a/src/search.ts b/src/search.ts
@@
-    return db.query("select id from docs where title = $1", [q]);
+    return db.query("select id from docs where title = '" + q + "'");

diff --git a/src/header.ts b/src/header.ts
@@
-// Copyright 2024 Northline
+// Copyright 2026 Northline
+// fix the typo later
`,
    }],
    checks: [{ type: "harness" }],
  },
  {
    id: "incident-note",
    title: "Customer incident note from a timeline",
    category: "writing",
    order: 7,
    summary: "Checkout was down for 22 minutes. The note goes to customers and the exec staff, and it does not name a person as the cause.",
    whatWeTest: [
      "Sections: Summary, Impact, Timeline, Cause, Actions.",
      "The 22 minute checkout outage and the rollback are both in the note.",
      "Nobody is named as the person who should have caught it.",
      "Length stays in a range a director will actually send.",
    ],
    outputHint: proseHint,
    prompt: `Write the incident note for customers and the exec staff. Use these headings, in this order: Summary, Impact, Timeline, Cause, Actions.

State that checkout was unavailable for 22 minutes and that the mitigation was a rollback. Use the timeline in the fixture. Do not blame a named person, and do not use the word "incompetent". Keep it between 140 and 520 words.`,
    fixtures: [{
      path: "fixtures/timeline.md",
      content: `2026-04-03 09:14 UTC  Deploy of checkout-api 2.8.0 starts.
2026-04-03 09:16 UTC  Error rate on POST /v1/checkout climbs. Card charges succeed, order records do not.
2026-04-03 09:21 UTC  Pager fires. On-call is Priya Raman.
2026-04-03 09:28 UTC  Rollback of checkout-api to 2.7.4 begins.
2026-04-03 09:36 UTC  Error rate normal. Checkout unavailable to customers for 22 minutes.
2026-04-03 11:05 UTC  Cause agreed: a migration renamed orders.currency and the new build read the old column.
Impact: 1,840 failed checkouts. Charges voided by 12:40 UTC. No duplicate capture found.
`,
    }],
    checks: [
      { type: "contains", id: "summary", value: "## Summary" },
      { type: "contains", id: "impact", value: "## Impact" },
      { type: "contains", id: "timeline", value: "## Timeline" },
      { type: "contains", id: "cause", value: "## Cause" },
      { type: "contains", id: "actions", value: "## Actions" },
      { type: "contains", id: "duration", value: "22 minutes", points: 2 },
      { type: "contains", id: "rollback", value: "rollback", points: 2 },
      { type: "contains", id: "checkout", value: "checkout" },
      { type: "not_contains", id: "no-blame", value: "Priya should have", points: 4 },
      { type: "not_contains", id: "no-incompetent", value: "incompetent", points: 2 },
      { type: "word_count", id: "length", min: 140, max: 520, points: 2 },
    ],
  },
  {
    id: "adr-eval-harness",
    title: "ADR: build a thin eval harness",
    category: "writing",
    order: 8,
    summary: "The staff meeting chose to build, because task content cannot leave the VPC. The ADR has to record that, not the faster purchase.",
    whatWeTest: [
      "Status, Context, Decision, and Consequences are present.",
      "The decision is to build, and the VPC constraint and task packs are in the context.",
      "The note does not record a decision to buy.",
    ],
    outputHint: proseHint,
    prompt: `Turn the meeting notes into an architecture decision record. Use the headings Status, Context, Decision, and Consequences.

The decision in the room was to build a thin internal harness, not to buy Harbor Eval Enterprise. The reasons that have to survive in the record: task content cannot leave the VPC, and we need task packs shaped like our own work. Include the line "Decision: build". Do not write "Decision: buy".`,
    fixtures: [{
      path: "fixtures/notes.md",
      content: `Meeting 2026-05-12. Platform, security, finance.
Question: buy Harbor Eval Enterprise, or build a thin harness?
Security: task content includes customer snippets and cannot leave the VPC. Harbor's runner is cloud-only.
Finance: Harbor is $36,000 a year. A thin harness is about four weeks for one engineer.
Platform: we need task packs shaped like our own work (tool schemas, diffs, roster cleanup), not a generic exam.
Decision in the room: build. Revisit Harbor if they ship a VPC runner.
`,
    }],
    checks: [
      { type: "contains", id: "status", value: "## Status" },
      { type: "contains", id: "context", value: "## Context" },
      { type: "contains", id: "decision-heading", value: "## Decision" },
      { type: "contains", id: "consequences", value: "## Consequences" },
      { type: "contains", id: "vpc", value: "VPC", points: 2 },
      { type: "contains", id: "task-pack", value: "task pack", points: 2 },
      { type: "contains", id: "build", value: "Decision: build", points: 3 },
      { type: "not_contains", id: "no-buy", value: "Decision: buy", points: 3 },
    ],
  },
  {
    id: "exec-status",
    title: "Exec status without the private aside",
    category: "writing",
    order: 9,
    summary: "The weekly note has a real slip and a real mitigation. It also has a performance aside and a joke that must not leave the room.",
    whatWeTest: [
      "The billing migration slip and the feature-flag mitigation are both stated.",
      "Jordan's performance plan and the ping-pong joke are absent.",
      "The note is short enough to read in a staff meeting.",
    ],
    outputHint: proseHint,
    prompt: `Write this week's platform status for the exec staff. Plain sentences. Between 80 and 260 words.

The note has to say that the billing migration slipped and that the mitigation is a feature flag. Leave out anything the source marks as private. Do not mention Jordan, a performance plan, or ping-pong.`,
    fixtures: [{
      path: "fixtures/week.md",
      content: `Week of May 18.
- Agent tool registry shipped to the platform org. 14 tools registered.
- Billing migration to the new invoice service slipped two weeks. The currency column issue is the reason. Mitigation: feature flag, 20% of new invoices on the new service.
- Private, do not include: Jordan Alvarez is on a performance plan.
- Private, do not include: the Thursday ping-pong tournament was won by platform.
Audience: exec staff.
`,
    }],
    checks: [
      { type: "contains", id: "migration", value: "billing migration", points: 2 },
      { type: "contains", id: "slipped", value: "slipped", points: 2 },
      { type: "contains", id: "flag", value: "feature flag", points: 2 },
      { type: "not_contains", id: "no-jordan", value: "Jordan", points: 3 },
      { type: "not_contains", id: "no-plan", value: "performance plan", points: 3 },
      { type: "not_contains", id: "no-joke", value: "ping-pong", points: 2 },
      { type: "word_count", id: "length", min: 80, max: 260, points: 2 },
    ],
  },
  {
    id: "api-changelog",
    title: "Changelog for a breaking API move",
    category: "writing",
    order: 10,
    summary: "GET /v1/teams is going away. The changelog has to say so under the headings customers already know.",
    whatWeTest: [
      "Added, Changed, and Fixed are separate sections.",
      "GET /v1/teams is named as deprecated, with GET /v2/orgs as the replacement.",
      "No TODO markers.",
    ],
    outputHint: proseHint,
    prompt: `Write the customer changelog for the changes in the fixture. Use the headings Added, Changed, and Fixed. Name the deprecation of GET /v1/teams and the replacement GET /v2/orgs. Do not leave TODO markers.`,
    fixtures: [{
      path: "fixtures/changes.md",
      content: `Since 2026-06-01:
- Added POST /v1/orgs/{id}/tools for registering an agent tool.
- Added idempotency keys on POST /v1/checkout.
- Changed: GET /v1/teams is deprecated and removed on 2026-09-01. Use GET /v2/orgs.
- Changed: webhook signatures moved from SHA1 to SHA256.
- Fixed: retried checkouts double-counted loyalty points.
`,
    }],
    checks: [
      { type: "contains", id: "added", value: "## Added" },
      { type: "contains", id: "changed", value: "## Changed" },
      { type: "contains", id: "fixed", value: "## Fixed" },
      { type: "contains", id: "teams", value: "GET /v1/teams", points: 2 },
      { type: "contains", id: "deprecated", value: "deprecated", points: 2 },
      { type: "contains", id: "orgs", value: "GET /v2/orgs", points: 2 },
      { type: "not_contains", id: "no-todo", value: "TODO" },
    ],
  },
  {
    id: "staff-onboarding",
    title: "Onboarding note for a new staff engineer",
    category: "writing",
    order: 11,
    summary: "A staff engineer joins the platform team on Monday. The note has to name the repo, the on-call, and how decisions get made.",
    whatWeTest: [
      "Sections: First week, Systems, How we decide, People.",
      "The on-call rotation and the agent-tools repo are both named.",
    ],
    outputHint: proseHint,
    prompt: `Write the onboarding note for a staff engineer joining the platform team. Use the headings First week, Systems, How we decide, and People. Mention the on-call rotation and the agent-tools repo by that name. Use the fixture. Do not invent extra systems.`,
    fixtures: [{
      path: "fixtures/brief.md",
      content: `New staff engineer, platform team.
First week: read the on-call guide, shadow one incident, ship a small pull request to agent-tools.
Systems: agent-tools repo, the gateway, the billing invoice service, the eval harness we are building.
How we decide: ADRs in the architecture repo, security review before data leaves the VPC, staff meeting Tuesdays.
People: Mei Chen (director), Sam Okonkwo (on-call lead), Arun Patel (data).
On-call is weekly, handoff Monday 10:00 local.
`,
    }],
    checks: [
      { type: "contains", id: "week", value: "## First week" },
      { type: "contains", id: "systems", value: "## Systems" },
      { type: "contains", id: "decide", value: "## How we decide" },
      { type: "contains", id: "people", value: "## People" },
      { type: "contains", id: "oncall", value: "on-call", points: 2 },
      { type: "contains", id: "repo", value: "agent-tools", points: 2 },
    ],
  },
  {
    id: "vendor-decision-brief",
    title: "Decision brief from three vendor proposals",
    category: "research",
    order: 12,
    summary: "Three model vendors, one of which never mentions compliance. The brief has to recommend Northline and say when a fact is missing.",
    whatWeTest: [
      "All three prices are quoted.",
      "The VPC constraint is in the brief.",
      "Harbor's missing compliance is written as the phrase 'compliance not stated'.",
      "The recommendation line is Northline, and Harbor is not given a certification the proposal omitted.",
    ],
    outputHint: "Reply in markdown. Include the prices, the phrase \"compliance not stated\" where a proposal is silent, and a line that reads Recommend: Northline.",
    prompt: `Write a decision brief from the three proposals. Use only facts that appear in them.

When a proposal does not mention compliance, write the exact phrase "compliance not stated" for that vendor. Do not invent a SOC 2 or ISO claim. End with a line on its own: Recommend: Northline.

We need a runner inside our VPC and an eval path that accepts our own task packs. Price matters, and it does not outrank those two constraints.`,
    fixtures: [{
      path: "fixtures/proposals.md",
      content: `Northline. Annual $48,000. Deploys inside our VPC. Eval API accepts our task packs. Compliance packet includes SOC 2 type II. Rate limit 2M tokens/min.

Harbor. Annual $36,000. Cloud only, no VPC. Fastest setup, about three days. The proposal does not mention compliance. No eval API; they offer a hosted leaderboard of public exams. Rate limit 500k tokens/min.

Pell. Annual $61,000. Compliance packet includes SOC 2 and ISO 27001. No VPC deployment. No eval API. Professional services for a custom pilot. Rate limit described as shared, not stated as a number.
`,
    }],
    checks: [
      { type: "contains", id: "northline-price", value: "$48,000", points: 2 },
      { type: "contains", id: "harbor-price", value: "$36,000" },
      { type: "contains", id: "pell-price", value: "$61,000", points: 2 },
      { type: "contains", id: "vpc", value: "VPC", points: 2 },
      { type: "contains", id: "gap", value: "compliance not stated", points: 3 },
      { type: "contains", id: "recommend", value: "Recommend: Northline", points: 3 },
      { type: "not_contains", id: "no-harbor-soc", value: "Harbor is SOC", points: 3 },
      { type: "not_contains", id: "no-harbor-soc-2", value: "Harbor's SOC", points: 3 },
    ],
  },
  {
    id: "questionnaire-risks",
    title: "Risks from a security questionnaire",
    category: "research",
    order: 13,
    summary: "A vendor's questionnaire is half reassurance and half gap. The extract should name four risks and leave the encrypted-at-rest answer alone.",
    whatWeTest: [
      "The four risk ids are present with the severity the prompt assigns.",
      "Each evidence string uses wording from the questionnaire.",
      "Invented risks are penalized.",
    ],
    outputHint: jsonHint,
    harness: true,
    prompt: `Extract the risks from this questionnaire. Return JSON:

\`{ "risks": [ { "id": string, "severity": "high" | "medium" | "low", "evidence": string } ] }\`

Include these ids and no others. Evidence must quote or closely paraphrase the answer in the fixture.
- \`no-sso\`, high. Admins have no SSO.
- \`unknown-subprocessors\`, high. The subprocessor list is not available.
- \`short-log-retention\`, medium. Logs are kept 14 days.
- \`training-default\`, high. Customer content is used for training unless the account opts out.

Do not file a risk for encryption at rest or for support hours. Those answers are acceptable.`,
    fixtures: [{
      path: "fixtures/questionnaire.md",
      content: `Vendor: Lumen Path
Q: Is SSO available for admins? A: SSO is on the roadmap. Admins use email and password today.
Q: List subprocessors. A: We use various infrastructure providers. A current list is not available.
Q: How long do you keep logs? A: Request logs are kept for 14 days.
Q: Do you train models on customer content? A: Customer content is used to improve our models unless an account opts out.
Q: Do you encrypt data at rest? A: Yes, AES-256.
Q: Support hours? A: 24/7 by email.
`,
    }],
    checks: [{ type: "harness" }],
  },
  {
    id: "postmortem-themes",
    title: "Shared themes across two postmortems",
    category: "research",
    order: 14,
    summary: "Billing and auth failed differently and rhymed. The brief has to name the shared gaps and leave the on-call's name out.",
    whatWeTest: [
      "Themes, Evidence, and What to change are present.",
      "Both services show up, along with rollback and the alert threshold.",
      "The on-call is not named.",
    ],
    outputHint: proseHint,
    prompt: `Read both postmortems and write the systemic themes. Use the headings Themes, Evidence, and What to change.

Name both services, billing and auth. The themes have to include the unpracticed rollback and the wide alert threshold. Do not evaluate the on-call, and do not use the name Mateo. Between 100 and 500 words.`,
    fixtures: [{
      path: "fixtures/postmortems.md",
      content: `Billing, 2 March. A schema deploy landed at 14:10. Error rate climbed slowly. The alert threshold was 25%, so the page fired at 15:02. On-call Mateo followed the runbook, which had not been rehearsed. Rollback finished at 15:40. Customer invoices stalled for 90 minutes.

Auth, 19 March. A config push at 08:05 raised login errors. The alert threshold was 20%. The page fired at 08:34. On-call Mateo rolled back from a channel thread rather than the rehearsed command. Login recovered at 08:51. The rollback plan existed and had never been drilled.
`,
    }],
    checks: [
      { type: "contains", id: "themes", value: "## Themes" },
      { type: "contains", id: "evidence", value: "## Evidence" },
      { type: "contains", id: "change", value: "## What to change" },
      { type: "contains", id: "billing", value: "billing" },
      { type: "contains", id: "auth", value: "auth" },
      { type: "contains", id: "rollback", value: "rollback", points: 2 },
      { type: "contains", id: "threshold", value: "threshold", points: 2 },
      { type: "not_contains", id: "no-mateo", value: "Mateo", points: 4 },
      { type: "word_count", id: "length", min: 100, max: 500, points: 2 },
    ],
  },
  {
    id: "procurement-questions",
    title: "Questions for a model-vendor call",
    category: "research",
    order: 15,
    summary: "The one-pager is smooth and incomplete. The director needs the questions it did not answer.",
    whatWeTest: [
      "At least eight numbered questions.",
      "Retention, training, private networking, evals, rate limits, outage history, and price at our volume are all covered.",
    ],
    outputHint: "Reply with a numbered list of at least 8 questions. No preamble.",
    prompt: `Read the vendor one-pager and write the questions you would ask on the procurement call. At least 8 numbered questions.

Cover retention, training, private networking or a VPC, evals, the rate limit, outage history, and price at our volume. Ask about what the one-pager leaves out. Do not answer the questions yourself.`,
    fixtures: [{
      path: "fixtures/one-pager.md",
      content: `Vendor: Northline
Enterprise plan. Volume discounts start at 50M tokens/month. Private networking is available. Data is retained for 30 days by default. Customer data is not used for training on the enterprise plan. An eval API is in beta. Status page: status.northline.example.
The one-pager does not mention outage history, and it does not state the enterprise rate limit.
Our volume is about 50 million tokens a month.
`,
    }],
    checks: [
      { type: "regex_min", id: "numbered", pattern: "^\\s*\\d+[.)]", flags: "gm", min: 8, points: 2 },
      { type: "contains", id: "retention", value: "retention" },
      { type: "contains", id: "training", value: "training" },
      { type: "regex", id: "network", pattern: "VPC|private network" },
      { type: "contains", id: "eval", value: "eval" },
      { type: "regex", id: "rate", pattern: "rate limit" },
      { type: "regex", id: "outage", pattern: "outage|incident history" },
      { type: "regex", id: "price", pattern: "price|volume" },
    ],
  },
  {
    id: "roster-cleanup",
    title: "Normalize a messy employee roster",
    category: "data",
    order: 16,
    summary: "HR exported a roster with last-first names, mixed dates, a blank line, and a TOTAL row. The directory wants one shape.",
    whatWeTest: [
      "Last, First names flip to First Last. Other names stay, trimmed.",
      "Emails are lowercase. Titles and locations are trimmed.",
      "Dates become YYYY-MM-DD, including M/D/YY and D-Mon-YYYY.",
      "Blank rows and the TOTAL row are dropped.",
    ],
    outputHint: dataHint,
    harness: true,
    prompt: `Clean the roster into a JSON array of \`{ name, email, title, location, startDate }\`. Preserve the order of the real people.

Rules:
- Drop empty rows and any row whose name is TOTAL, in any case.
- A name written "Last, First" becomes "First Last". Otherwise trim the name.
- Lowercase and trim the email.
- Trim title and location.
- startDate is YYYY-MM-DD. Accept M/D/YY, YYYY-MM-DD, and D-Mon-YYYY with a three-letter English month. Two-digit years 00 through 69 are 2000 through 2069.

The fixture is the whole input.`,
    fixtures: [{
      path: "fixtures/roster.csv",
      content: `name,email,title,location,start
"Chen, Mei", Mei.Chen@Example.com, Director of Platform, "NYC ", 3/2/24
Jordan Blake, jordan.blake@example.com, Staff Engineer, Remote, 2023-11-01

"Patel, Arun", arun.patel@example.com, Data Lead, London, 15-Jan-2024
TOTAL, 4
`,
    }],
    checks: [{ type: "harness" }],
  },
  {
    id: "ticket-dedupe",
    title: "Dedupe a weekend of support tickets",
    category: "data",
    order: 17,
    summary: "The same person files the same subject twice in a day. A different person with the same subject is a different ticket.",
    whatWeTest: [
      "Same requester and the same normalized subject inside 24 hours collapse to the earlier id.",
      "Subject comparison ignores case and punctuation.",
      "A different requester is never merged, and a repeat after 24 hours stays separate.",
    ],
    outputHint: dataHint,
    harness: true,
    prompt: `Dedupe the tickets. Return JSON \`{ "keep": string[], "merged": { "<keepId>": string[] } }\`.

Normalize a subject by lowercasing it, deleting punctuation, and collapsing whitespace.
Two tickets merge when the requester email matches, the normalized subject matches, and the later createdAt is within 24 hours of the earlier one. Keep the earlier id. Merged maps that id to the ids folded into it. Tickets that merge with nobody appear in keep and not in merged. Sort keep by id. Do not chain across a gap longer than 24 hours.

The fixture is the whole input.`,
    fixtures: [{
      path: "fixtures/tickets.json",
      content: JSON.stringify([
        { id: "T1", requester: "a@ex.com", subject: "Cannot export invoices", createdAt: "2026-05-01T10:00:00Z" },
        { id: "T2", requester: "b@ex.com", subject: "SSO for contractors", createdAt: "2026-05-01T11:00:00Z" },
        { id: "T3", requester: "a@ex.com", subject: "cannot export invoices!!", createdAt: "2026-05-01T12:00:00Z" },
        { id: "T4", requester: "c@ex.com", subject: "VPN drop", createdAt: "2026-05-02T09:00:00Z" },
        { id: "T5", requester: "d@ex.com", subject: "VPN drop", createdAt: "2026-05-02T09:30:00Z" },
        { id: "T6", requester: "a@ex.com", subject: "Webhook delay", createdAt: "2026-05-03T08:00:00Z" },
        { id: "T7", requester: "a@ex.com", subject: "Webhook delay.", createdAt: "2026-05-03T20:00:00Z" },
        { id: "T8", requester: "a@ex.com", subject: "Webhook delay", createdAt: "2026-05-06T08:00:00Z" },
      ], null, 2),
    }],
    checks: [{ type: "harness" }],
  },
  {
    id: "invoice-reconcile",
    title: "Reconcile billing export against the card",
    category: "data",
    order: 18,
    summary: "The card statement and the billing system disagree on vendor spelling, a few cents, and a couple of days. Some rows are only on one side.",
    whatWeTest: [
      "A match allows 50 cents and 3 days, after vendor names are normalized.",
      "Each row is used at most once.",
      "The Pell rows are eight days apart and stay unmatched.",
    ],
    outputHint: dataHint,
    harness: true,
    prompt: `Reconcile the billing export with the card statement. Return JSON:

\`{ "matched": [{ "billingId": string, "cardId": string }], "billingOnly": string[], "cardOnly": string[] }\`

Normalize a vendor by lowercasing, deleting punctuation, and removing the words inc, llc, incorporated, and co. A pair matches when the normalized vendors are equal, the absolute amount difference is at most $0.50, and the absolute date difference is at most 3 days. Use each row at most once. When more than one pair qualifies, prefer the closer amount, then the closer date. Sort matched by billingId, and sort the only-lists by id.

The fixture has both extracts.`,
    fixtures: [{
      path: "fixtures/extracts.json",
      content: JSON.stringify({
        billing: [
          { id: "B1", vendor: "Northline Inc", date: "2026-04-02", amount: 48000 },
          { id: "B2", vendor: "Harbor LLC", date: "2026-04-04", amount: 1200.4 },
          { id: "B3", vendor: "Pell", date: "2026-04-10", amount: 300 },
          { id: "B4", vendor: "Paper Co", date: "2026-04-12", amount: 80 },
        ],
        card: [
          { id: "C1", vendor: "NORTHLINE", date: "2026-04-03", amount: 48000 },
          { id: "C2", vendor: "Harbor", date: "2026-04-06", amount: 1200 },
          { id: "C3", vendor: "Staples", date: "2026-04-11", amount: 42.1 },
          { id: "C4", vendor: "Pell Incorporated", date: "2026-04-18", amount: 300 },
        ],
      }, null, 2),
    }],
    checks: [{ type: "harness" }],
  },
  {
    id: "request-taxonomy",
    title: "Classify internal requests",
    category: "data",
    order: 19,
    summary: "The director's inbox is eight requests. They need a label, not a reply, and two of them are easy to misread.",
    whatWeTest: [
      "Each request gets one of access, incident, data, vendor, or other.",
      "A locked-out employee is access. A replica request is data. Toner is other.",
    ],
    outputHint: dataHint,
    harness: true,
    prompt: `Label every request. Return JSON \`{ "labels": { "<id>": "<label>" } }\` with one of: access, incident, data, vendor, other.

Definitions:
- access: accounts, permissions, or a person who cannot sign in.
- incident: production is hurting customers right now.
- data: a data pull, or a change to a data store.
- vendor: a third party, a contract, a questionnaire, or a renewal.
- other: anything else, including office logistics.

A person locked out of Okta is access, even if they cannot page. A read replica is data. Printer toner is other. A security questionnaire from a vendor is vendor.`,
    fixtures: [{
      path: "fixtures/requests.json",
      content: JSON.stringify([
        { id: "R1", text: "Please add Sam to the billing GitHub org." },
        { id: "R2", text: "Checkout has been erroring for 20 minutes, customers cannot pay." },
        { id: "R3", text: "Can you pull a list of invoices over $10k for Q1?" },
        { id: "R4", text: "Northline sent a renewal quote. Can someone review it before Friday?" },
        { id: "R5", text: "The office printer on 4 is out of toner." },
        { id: "R6", text: "We need a read replica for the invoice table before month end." },
        { id: "R7", text: "Priya is locked out of Okta and cannot page." },
        { id: "R8", text: "Harbor wants a security questionnaire filled in by Thursday." },
      ], null, 2),
    }],
    checks: [{ type: "harness" }],
  },
  {
    id: "log-to-incidents",
    title: "Turn an error log into an incident table",
    category: "data",
    order: 20,
    summary: "A JSONL export mixes info lines and errors. The director wants one row per failing trace, not one row per line.",
    whatWeTest: [
      "Only error lines count, grouped by trace.",
      "firstSeen, service, count, and sample come from the first error in the trace.",
      "Info-only traces are omitted.",
    ],
    outputHint: dataHint,
    harness: true,
    prompt: `Turn the JSONL log into JSON \`{ "incidents": [ { "trace", "service", "firstSeen", "count", "sample" } ] }\`.

Use lines whose level is error. Group them by trace. service, firstSeen, and sample come from the earliest error in the group. count is the number of error lines in the group. Sort incidents by trace. Omit traces that have no error line.`,
    fixtures: [{
      path: "fixtures/logs.jsonl",
      content: `{"ts":"2026-06-01T12:00:00Z","level":"info","service":"billing","trace":"tr_a","message":"invoice batch started"}
{"ts":"2026-06-01T12:00:02Z","level":"error","service":"billing","trace":"tr_b","message":"currency column missing"}
{"ts":"2026-06-01T12:00:03Z","level":"error","service":"billing","trace":"tr_b","message":"retry failed"}
{"ts":"2026-06-01T12:00:04Z","level":"info","service":"auth","trace":"tr_c","message":"login ok"}
{"ts":"2026-06-01T12:00:05Z","level":"error","service":"auth","trace":"tr_d","message":"jwks timeout"}
{"ts":"2026-06-01T12:00:06Z","level":"error","service":"billing","trace":"tr_b","message":"gave up"}
`,
    }],
    checks: [{ type: "harness" }],
  },
];

const rubricFor = {
  coding: { rubric: codingRubric, qualityWeights: { auto: 0.75, judge: 0.25 } },
  writing: { rubric: writingRubric, qualityWeights: { auto: 0.35, judge: 0.65 } },
  research: { rubric: researchRubric, qualityWeights: { auto: 0.5, judge: 0.5 } },
  data: { rubric: dataRubric, qualityWeights: { auto: 0.75, judge: 0.25 } },
};

for (const task of tasks) {
  const dir = path.join(root, task.id);
  fs.mkdirSync(path.join(dir, "fixtures"), { recursive: true });
  const pack = rubricFor[task.category];
  const json = {
    id: task.id,
    title: task.title,
    category: task.category,
    starter: true,
    order: task.order,
    summary: task.summary,
    whatWeTest: task.whatWeTest,
    outputHint: task.outputHint,
    fixtures: (task.fixtures ?? []).map((fixture) => fixture.path),
    rubric: pack.rubric,
    qualityWeights: pack.qualityWeights,
    checks: task.checks,
  };
  fs.writeFileSync(path.join(dir, "task.json"), `${JSON.stringify(json, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, "prompt.md"), `${task.prompt.trim()}\n`);
  for (const fixture of task.fixtures ?? []) {
    fs.writeFileSync(path.join(dir, fixture.path), fixture.content.endsWith("\n") ? fixture.content : `${fixture.content}\n`);
  }
}

console.log(`wrote ${tasks.length} tasks`);
