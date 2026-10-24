Extract the risks from this questionnaire. Return JSON:

`{ "risks": [ { "id": string, "severity": "high" | "medium" | "low", "evidence": string } ] }`

Include these ids and no others. Evidence must quote or closely paraphrase the answer in the fixture.
- `no-sso`, high. Admins have no SSO.
- `unknown-subprocessors`, high. The subprocessor list is not available.
- `short-log-retention`, medium. Logs are kept 14 days.
- `training-default`, high. Customer content is used for training unless the account opts out.

Do not file a risk for encryption at rest or for support hours. Those answers are acceptable.
