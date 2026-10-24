export const INCIDENT_INKWELL = `
## Summary

Checkout was unavailable to customers for 22 minutes on 3 April 2026 after the checkout-api 2.8.0 deploy. Card charges succeeded while the order record did not. Those charges were voided the same day, and the review found no duplicate capture.

## Impact

1,840 checkouts failed between 09:16 and 09:36 UTC. The customer-facing outage was those 22 minutes. By 12:40 UTC the voided charges were confirmed. Orders that never recorded were not captured twice.

## Timeline

- 09:14 UTC. The deploy of checkout-api 2.8.0 starts.
- 09:16 UTC. The error rate on POST /v1/checkout climbs.
- 09:21 UTC. The pager fires.
- 09:28 UTC. Rollback of checkout-api to 2.7.4 begins.
- 09:36 UTC. The error rate returns to normal. Checkout had been down for 22 minutes.
- 11:05 UTC. The group agrees the cause.

## Cause

The 2.8.0 migration renamed orders.currency. The new build still read the old column, so the order write failed after the charge had already succeeded.

## Actions

- Fail the deploy when the build and the schema disagree on a column.
- Rehearse the checkout rollback until the steps are boring.
- Stop the charge when the order write fails, instead of voiding it later.
`.trim();

export const INCIDENT_SURVEYOR = INCIDENT_INKWELL.replace("## Actions", "## Follow-ups");

export const INCIDENT_PRO = INCIDENT_INKWELL.replace(
  "The 2.8.0 migration renamed orders.currency.",
  "Priya should have caught the column rename in review. The 2.8.0 migration renamed orders.currency.",
);

export const INCIDENT_FLASH = `
Checkout had a bad deploy this morning. Some payments failed and we rolled something back later. The team is looking at the database column. We will update customers if it happens again.
`.trim();

export const ADR_INKWELL = `
## Status

Accepted, 12 May 2026.

## Context

We want to score models on work we actually do: tool schemas, diffs, and roster cleanup. Harbor Eval Enterprise costs $36,000 a year and its runner is cloud-only. Task content includes customer snippets and cannot leave the VPC. A thin internal harness is about four weeks for one engineer. We need task packs shaped like our own work, not a public exam.

## Decision

Decision: build a thin harness and keep task content inside our network. Revisit a purchase only if a vendor ships a runner inside the VPC.

## Consequences

We own the task format, the runner, and the leaderboard. The cost is staff time, not a license. Customer snippets stay in the VPC. The harness does not replace a later procurement review of model vendors.
`.trim();

export const ADR_SURVEYOR = ADR_INKWELL.replace("## Consequences", "## Cost");

export const ADR_PRO = `
## Status

Proposed, 12 May 2026.

## Context

Harbor Eval Enterprise is on the shelf for $36,000 a year. Building our own runner would take about four weeks. The security note says task content cannot leave the VPC, and Harbor's runner is cloud-only.

## Decision

Decision: buy Harbor Eval Enterprise. Four weeks is too long, and we can accept the VPC gap for tasks that are not customer data. We can still write a task pack later if the product disappoints.

## Consequences

We start scoring next month. Security will list which tasks are allowed to leave the network. If Harbor cannot take a private runner, we live with the cloud runner.
`.trim();

export const ADR_FLASH = `
We should probably buy a tool. Building one sounds slow. Finance said the license is cheaper than a month of an engineer. Let's decide at the next staff meeting.
`.trim();

export const EXEC_INKWELL = `
The platform org shipped the agent tool registry this week. Fourteen tools are registered, and new ones now go through that list instead of a side channel.

The billing migration onto the new invoice service slipped two weeks. The cause is the currency column mismatch from the checkout incident. The mitigation is a feature flag: 20% of new invoices run on the new service, and the rest stay on the current path. We will not widen the flag until that column is closed and a rollback has been rehearsed on the invoice service.

Nothing else on the platform roadmap moved. I will bring the flag percentage and the revised migration date to the next staff review, with a recommendation on whether 20% is still the right ceiling.
`.trim();

export const EXEC_SURVEYOR = `
Platform shipped the agent tool registry. Fourteen tools are registered.

The billing migration to the new invoice service slipped two weeks because of the currency column. Mitigation is a feature flag holding 20% of new invoices on the new service. The flag stays there until the column mismatch is fixed and the rollback path has been rehearsed.

I will report the revised date and the flag percentage at the next staff review. No other platform date moved this week.
`.trim();

export const EXEC_PRO = `
The platform org shipped the agent tool registry this week, with 14 tools registered.

The billing migration to the new invoice service slipped two weeks. The mitigation is a feature flag, with 20% of new invoices on the new service. We should keep the rest of the traffic on the old path until the currency column is fixed.

Separately, Jordan Alvarez is on a performance plan, which is slowing review on the invoice service. I would not put that in the customer note, but the staff packet should see it. The revised migration date follows once review bandwidth is back.
`.trim();

export const EXEC_FLASH = `
Billing slipped this week. We shipped the tool registry and will send a fuller note once the migration date is firm. The team is on it.
`.trim();

export const CHANGELOG_INKWELL = `
## Added

- POST /v1/orgs/{id}/tools registers an agent tool.
- Idempotency keys on POST /v1/checkout.

## Changed

- GET /v1/teams is deprecated and will be removed on 2026-09-01. Clients should call GET /v2/orgs.
- Webhook signatures moved from SHA1 to SHA256.

## Fixed

- Retried checkouts no longer double-count loyalty points.
`.trim();

export const CHANGELOG_PRO = CHANGELOG_INKWELL;

export const CHANGELOG_SURVEYOR = `
## Added

- POST /v1/orgs/{id}/tools registers an agent tool.
- Idempotency keys on POST /v1/checkout.

## Changed

- GET /v1/teams is deprecated and will be removed on 2026-09-01. Use GET /v2/orgs.
- Webhook signatures moved from SHA1 to SHA256.
- Retried checkouts no longer double-count loyalty points.
`.trim();

export const CHANGELOG_FLASH = `
We added a tools endpoint and idempotency on checkout. Teams moved to a newer orgs endpoint. Webhooks use a stronger hash now. Loyalty points were counting twice on retries and that is sorted.
`.trim();

export const ONBOARD_INKWELL = `
## First week

Read the on-call guide, shadow one incident, and open a small pull request against agent-tools. The goal of the week is a shipped change, not a tour.

## Systems

You will work in agent-tools, the gateway, the billing invoice service, and the eval harness we are building. On-call is weekly. Handoff is Monday at 10:00 local, and Sam walks the incoming person through the open pages.

## How we decide

Architecture decisions are ADRs in the architecture repo. Security reviews anything that would let data leave the VPC before it is built. The staff meeting is Tuesday, and that is where dates move.

## People

Mei Chen is the director. Sam Okonkwo leads on-call. Arun Patel covers data, including the roster and invoice extracts that keep landing in the harness.
`.trim();

export const ONBOARD_SURVEYOR = ONBOARD_INKWELL;

export const ONBOARD_PRO = `
## First week

Read the on-call guide, shadow one incident, and ship a small change in agent-tools.

## Systems

The systems that matter are agent-tools, the gateway, and the billing invoice service. On-call is weekly, with handoff on Monday at 10:00 local.

## People

Mei Chen directs the org. Sam Okonkwo runs on-call. Arun Patel covers data.
`.trim();

export const ONBOARD_FLASH = `
## First week

Clone the repos and say hello in the staff channel. Ask someone which system is on fire.

## Systems

There is a gateway and a billing service. Docs are in the repo somewhere.
`.trim();

export const VENDOR_SURVEYOR = `
## Recommendation

Recommend: Northline

## Comparison

Northline is $48,000 a year. It deploys inside our VPC and its eval API accepts our task packs. The proposal includes a SOC 2 type II packet, and the stated rate limit is 2 million tokens per minute.

Harbor is $36,000 a year and can be stood up in about three days. It is cloud only, with no VPC deployment and no eval API. Compliance not stated. The rate limit in the proposal is 500 thousand tokens per minute.

Pell is $61,000 a year. The packet includes SOC 2 and ISO 27001. There is no VPC deployment and no eval API. The rate limit is described as shared and is not given as a number.

## Why

The tasks we want to score include customer snippets, so the runner has to live in the VPC and it has to accept a task pack we wrote. Harbor is cheaper and misses both. Pell has the thicker compliance packet and still cannot run in the VPC. Northline is the only proposal that meets the two constraints we cannot waive.

## Gaps

Harbor: compliance not stated, and there is no VPC runner. Pell: no VPC and no eval API.
`.trim();

export const VENDOR_PRO = `
## Recommendation

Recommend: Northline

## Comparison

Northline is $48,000 a year, deploys in our VPC, and offers an eval API for our task packs. Harbor is $36,000, cloud only, and Harbor is SOC 2 certified on the same terms as the others. Pell is $61,000 and includes SOC 2 and ISO 27001, without a VPC deployment.

## Why

Northline is the only option with a VPC runner and an eval API. Harbor is cheaper. Pell is the dearest and still cannot run privately. I would sign Northline and ask Harbor for a private-runner roadmap as a backup.
`.trim();

export const VENDOR_INKWELL = `
## Recommendation

Recommend: Northline

Northline reads like the partner we can actually live with. The proposal is $48,000 a year, the runner sits in our VPC, and they will take a task pack through an eval API. That is the shape of the work.

Harbor, at $36,000, is the quick one. Their sales note says setup is three days. Harbor's SOC 2 report is available on request, and the runner stays in their cloud. I would thank them and keep the door closed.

Pell is the heavy packet: SOC 2, ISO 27001, and a professional-services pilot. There is no VPC deployment and no eval API. The price is the highest of the three. It is a compliance story without a place to run our tasks.

## Why

We cannot send customer snippets to a vendor cloud, and we cannot score ourselves on someone else's public exam. Northline is the draft I would send to the staff meeting.
`.trim();

export const VENDOR_FLASH = `
Pick Harbor. It is the cheap option at $36,000 and they can start in three days. The other two cost more and take longer to turn on. We can move later if we need to.
`.trim();

export const THEMES_SURVEYOR = `
## Themes

Two incidents, billing and auth, failed the same way. The rollback was not a drill anyone had practiced, and the alert threshold was wide enough that the pager fired late.

## Evidence

The billing incident ran for most of an hour before the page. The alert required a 25% error rate, so a slower failure never crossed it. The rollback steps were in a doc and had not been run since the service launched.

The auth incident was a config push. The alert threshold sat at 20%. Login errors climbed under that line for a long stretch, and the rollback was a channel message rather than a rehearsed command. Both services had a rollback plan on paper.

## What to change

- Drill rollback on billing and auth until a different person can run it without the author in the room.
- Tighten the alert threshold on both services so a partial failure pages before customers write in.
- Record the drill date next to the runbook. A runbook with no date is a rumor.
`.trim();

export const THEMES_INKWELL = THEMES_SURVEYOR;

export const THEMES_PRO = THEMES_SURVEYOR.replace(
  "The billing incident ran for most of an hour before the page.",
  "Mateo was on call for billing and missed the early signal. The billing incident ran for most of an hour before the page.",
);

export const THEMES_FLASH = `
Billing had an outage because a deploy went badly. We should be more careful next time and page faster. Auth was also noisy that week.
`.trim();

export const QUESTIONS_SURVEYOR = `
1. What is the retention window for prompts and outputs on the enterprise plan, and can we set it below the default 30 days?
2. Is customer content excluded from training for every product surface, or only for the enterprise plan we were quoted?
3. Does private networking include a VPC deployment we operate, or only a private link into your cloud?
4. What does the eval API accept today, and can it score a task pack we wrote rather than a public exam?
5. What is the rate limit on the enterprise plan, and what happens to in-flight agent calls when we hit it?
6. What is the outage history for the last 12 months, including incidents that never reached the status page?
7. What is the price at our volume, around 50 million tokens a month, once the volume discount is applied?
8. Who is on the hook during an incident, and what is the first hour of the support path?
`.trim();

export const QUESTIONS_PRO = `
1. What is the retention window for prompts and outputs, and can we shorten the default 30 days?
2. Is customer content excluded from training on the enterprise plan, including tools and logs?
3. Does private networking mean a VPC we run, or a private link into yours?
4. Can the eval API score a task pack we supply?
5. What is the rate limit on the enterprise plan at our expected concurrency?
6. What is the price at our volume of about 50 million tokens a month?
7. Which subprocessors see prompt content, and where is that list published?
8. What does the first hour of support look like when the status page is green and our calls are failing?
`.trim();

export const QUESTIONS_INKWELL = `
1. How long is retention of prompts and outputs, and who can delete a tenant's history?
2. Will our content be used for training, including the free surfaces a staff member might try?
3. Can the runner sit in our VPC, or is private networking a tunnel back to you?
4. What is the price at our volume, and which discount actually applies at 50 million tokens?
5. What outage history should we read before we sign, not just the status page highlights?
6. Who answers in the first hour of an incident?
7. Can we bring our own task pack, or do you only score a fixed public suite?
8. What does cancellation look like if we have to leave in the first year?
`.trim();

export const QUESTIONS_FLASH = `
1. What is the price?
2. When can we start?
3. Who is the account manager?
4. Can we run a short pilot first?
`.trim();
