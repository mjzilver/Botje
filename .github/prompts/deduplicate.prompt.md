---
description: "Find and fix code duplication. Runs jscpd, analyses the clones, and refactors production-code duplicates using shared helpers or base-class methods."
name: "Deduplicate"
agent: "agent"
---

## Step 1 — Run the scanner

```bash
npx jscpd src/ --ignore "src/__tests__/**" --min-lines 5 --min-tokens 50
```

Collect the full clone list from stdout.

## Step 2 — Triage

For each reported clone, classify it as one of:

| Class | Description | Action |
|---|---|---|
| **Structural** | Identical or near-identical blocks in production files | Fix |
| **Boilerplate** | Import headers, trivial one-liners, test setup | Skip |
| **Coincidental** | Unrelated code that happens to look similar | Skip |

Only proceed with **Structural** clones.

## Step 3 — Fix strategy (pick the right one)

- **Same class hierarchy** → lift shared logic into the base class as a `protected` method.
- **Sibling modules** (e.g. two commands with identical DB query + send pattern) → extract a module-level helper function in the file that is logically most responsible, or create a small shared utility if both callers live in different files.
- **Two usages of the same algorithm** → extract a pure function, place it in `src/systems/` if it is domain-agnostic, or co-locate it with the primary consumer otherwise.

## Step 4 — Apply fixes

For each fix:
1. Write the shared helper/method.
2. Replace both (all) duplicated blocks with a call to the helper.
3. Ensure TypeScript types are preserved — no `any`, no primitive casts.
4. Follow the project rules in `.github/copilot-instructions.md`.

## Step 5 — Verify

```bash
npx tsc --noEmit
npm test
```

All tests must still pass. If any break, fix them before continuing.

## Step 6 — Re-run the scanner

```bash
npx jscpd src/ --ignore "src/__tests__/**" --min-lines 5 --min-tokens 50
```

Confirm that the fixed clones are gone and no new ones were introduced.

## Known hotspots in this project (as of 2 June 2026)

- `src/commands/listers/` — `replies.ts`, `said.ts`, `reactions.ts`, `emotes.ts`, `count.ts` all repeat large chunks of their `total`/`mention`/`perPerson`/`percentage` method bodies. The base class `lister.ts` is the natural home for shared helpers.
- `src/commands/about.ts` ↔ `src/commands/topic.ts` — shared topic-fetching block (~11 lines).
- `src/commands/combine.ts` ↔ `src/commands/getemote.ts` — shared emote-file lookup (~6 lines).
