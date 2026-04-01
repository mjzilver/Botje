---
description: "Run full verification: type-check, lint, and tests. Use before committing or after making changes."
name: "Verify"
agent: "agent"
---

Run the full verification pipeline for this project in order. Stop and report if any step fails.

1. **Type-check** — `npx tsc --noEmit`
2. **Lint** — `npm run lint`
3. **Tests** — `npm test`
4. **Build** — `npm run build`

For any failures, show the exact error output and fix the issues before re-running the failing step.
