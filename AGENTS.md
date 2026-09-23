# Repository instructions

@/home/dbram/.codex/RTK.md

Use the `ctx7` CLI to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service. Run `npx ctx7@latest library <name> "<user's question>"` first, then `npx ctx7@latest docs <libraryId> "<user's question>"`. Use no more than three commands per question, do not include secrets, and do not use this for refactoring, scripts from scratch, business logic debugging, code review, or general programming concepts. If the CLI reports quota exhaustion, explain that and suggest `npx ctx7@latest login` or `CONTEXT7_API_KEY`; if it reports a DNS/network failure, retry outside the sandbox.

## Local session handoffs

- Keep project session state locally in `.local-sessions/current.md`. This directory is intentionally Git-ignored and must not be moved to cloud storage.
- At the start of a session, read the handoff if it exists and continue from it.
- Before ending a substantial session or after a major milestone, update the handoff with the goal, completed work, remaining work, relevant decisions, verification results, and latest commit. Keep it concise and never put credentials or other secrets in it.
- Store a useful project handoff, not a raw conversation transcript.
