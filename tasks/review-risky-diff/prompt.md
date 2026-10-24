Review this pull request for a director who will not read the patch. Return JSON:

`{ "findings": [ { "severity": "high" | "medium" | "low", "file": string, "issue": string, "suggestion": string } ] }`

File a finding only for a real issue.
- Logging a live API key is high severity.
- Building SQL by concatenating request input is high severity.
- Do not file a finding about the copyright header or the comment that says to fix a typo later.

The diff is the fixture.
