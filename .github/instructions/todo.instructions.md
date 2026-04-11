---
applyTo: "todo.md"
---

# Todo Workflow

`todo.md` is the single source of truth for tracked improvements. It works like
simplified local GitHub issues: each item is self-contained, ordered by priority,
and **removed entirely when complete** — there is no "done" column.

---

## Item Format

Every item must follow this exact shape:

```markdown
### <N>. <Short imperative title>

**Problem:** One paragraph describing what is wrong and why it matters.

**Fix:**
Description of the approach, or a numbered list of concrete steps.

**Files:** `path/to/file.ts`, `path/to/other.ts`
```

- `N` is a sequential integer. Re-number when items are added or removed.
- The title must be imperative and self-contained (readable without context).
- `**Files:**` is required. List every file that must change.

---

## Adding a Todo

1. Read todo.md to see the current highest N.
2. Audit the codebase for the category of issue being tracked:
   - Type safety violations (`as string`, `as Error`, untyped generics)
   - Architecture boundary violations (discord.js leaking into commands)
   - Async rule violations (`.then()/.catch()` chains)
   - Missing test coverage for observable command behaviour
3. Write one item per distinct problem. Do not batch unrelated issues.
4. Append the new item at the bottom of the "Next Up" section.

---

## Completing a Todo

Work through items top-to-bottom (highest priority first). For each:

1. **Read the item** — understand every file listed before touching anything.
2. **Implement** — make only the changes described. Do not expand scope.
3. **Verify** — run the full pipeline in order; stop if anything fails:
   ```
   npx tsc --noEmit
   npm run lint
   npx vitest run
   ```
   Fix failures before proceeding. If lint reports formatting issues, run
   `npx prettier --write <files>` then re-run lint.
4. **Remove the item** — delete the entire `### N. …` block from todo.md,
   including the trailing `---` separator. Re-number remaining items.
5. **Commit** — `git add -A && git commit -m "<type>: <description>"` using
   conventional commits. Push immediately.

Never mark an item complete without running verify. Never leave a completed item
in the file in any form (no strikethrough, no ✅, no "Done" label).

---

## Commit Message Convention

```
fix: <what was broken and how it was fixed>
test: <what was tested and what layer>
refactor: <what was restructured without changing behaviour>
```

One commit per todo item. The message must make sense without reading the diff.
