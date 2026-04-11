---
description: "Manage the todo.md backlog: add new items, pick the next item to implement, or implement and remove the current top item."
name: "Todo"
agent: "agent"
---

You are managing the `todo.md` backlog for this project.

## What do you need?

Reply with one of:
- **"add"** — audit the codebase and add a new todo item
- **"next"** — show and begin implementing the top-priority item
- **"list"** — summarise all current items in one line each

---

## If "add"

1. Ask what category to audit (type safety / async rules / architecture / tests), or infer it from context.
2. Search the codebase for violations in that category using grep/semantic search.
3. Write a todo item following the format in `.github/instructions/todo.instructions.md`.
4. Append it to `todo.md` with the next sequential number.
5. Confirm what was added and why.

## If "next"

1. Read `todo.md` — take the first item under "Next Up".
2. Re-read every file listed in **Files:** before touching anything.
3. Implement the fix exactly as described. Do not expand scope.
4. Run the verify pipeline:
   ```
   npx tsc --noEmit
   npm run lint
   npx vitest run
   ```
   Fix any failures (format with `npx prettier --write <files>` if needed, re-run lint).
5. Once all three pass, **delete** the completed item from `todo.md` entirely.
6. Commit: `git add -A && git commit -m "<type>: <description>" && git push`

## If "list"

Print each item as: `N. <title> — <files>`
