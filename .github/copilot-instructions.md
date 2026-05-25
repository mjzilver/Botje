# Botje Copilot Instructions

## Project Overview

Discord bot written in TypeScript (CommonJS, ES2022 target). Stack: discord.js v14, PostgreSQL via `pg`, Winston logging, Vitest tests. All source is under `src/`. Build: `tsc && cp -r src/json dist/json`. Tests: `vitest run`.

---

## Hard Rules — Never Violate

### No `any`
Never use `any`. Use proper generics, union types, or narrow with `instanceof`/type guards.

```ts
// ✗ Wrong
function process(data: any) {}

// ✓ Correct
function process<T extends QueryResultRow>(data: T) {}
```

### No `unknown` in business logic
`unknown` is only permitted in two specific places:
1. **`catch` variables** — always narrow immediately with `toError(err)` from `src/systems/utils.ts`
2. **`src/systems/messageAdapter.ts`** — the single boundary file that casts discord.js types to project abstractions using `as unknown as X`

```ts
// ✗ Wrong — bare logger.error(err)
catch (err) { logger.error(err); }

// ✓ Correct — use toError
import { toError } from "../systems/utils";
catch (err) { logger.error(toError(err)); }
```

### No `undefined` in public types
Never use `undefined` in `SqlParam`, database params, or public-facing interfaces. Use `null` for optional database values.

```ts
// ✗ Wrong
query(sql: string, params?: (string | undefined)[]): Promise<void>

// ✓ Correct
query(sql: string, params?: SqlParam[]): Promise<void>
// SqlParam = string | number | boolean | null | Date | Buffer
```

### No comments
Zero inline comments or JSDoc. Code must be self-explaining through naming and types.

### No `as string`, `as number`, or other primitive casts
Use typed DB generics instead:

```ts
// ✗ Wrong
const content = rows[0]["message"] as string;

// ✓ Correct
const rows = await db.query<{ message: string }>(sql, params);
const content = rows[0].message;
```

---

## TypeScript Strictness

`tsconfig.json` enforces:
- `strict: true` — includes `strictNullChecks`, `noImplicitAny`
- `noUnusedLocals: true` — no declared-but-unused locals or imports
- `noUnusedParameters: true` — prefix unused params with `_` (e.g. `_args`)
- `noImplicitOverride: true` — subclass methods that override must be marked `override`
- `useUnknownInCatchVariables: true` — catch variables are `unknown` by default

---

## Architecture

### Abstractions over discord.js
Never import or use discord.js types (`discord.Message`, `discord.Guild`, etc.) directly in commands or systems. Always use the project's own interfaces:

- `BotMessage`, `BotGuild`, `BotMember`, `BotUser`, `BotReaction` from `src/interfaces/discord.ts`
- `MessageContent` for anything sent to Discord

The only place discord.js types are used directly is `src/systems/eventListener.ts`, `src/systems/bot.ts`, and `src/systems/messageAdapter.ts`.

### The Adapter Boundary
`src/systems/messageAdapter.ts` is the **only** file allowed to use `as unknown as X`. It provides typed conversion functions:

```ts
toBotMessage(message: discord.Message): BotMessage
toPartialBotMessage(message: discord.Message | discord.PartialMessage): BotMessage
toBotReaction(reaction: discord.MessageReaction | ...): BotReaction
toBotChannel(channel: discord.TextBasedChannel | null): BotMessage["channel"]
```

Import these wherever a discord.js type must become a project type.

### Interface-Driven Services
Every system exposes an interface from `src/interfaces/index.ts` (`IDatabase`, `IMessageHandler`, `ILogger`, `IUserHandler`). Use only the interface in dependent code — never the concrete class.

### Command Shape
All regular commands must `satisfies ICommand`. All commandline commands must `satisfies IClCommand`. Never use `as ICommand`.

```ts
export default {
    name: "ping",
    description: "...",
    format: "ping",
    async function(message) {
        const bot = getBotContext();
        ...
    }
} satisfies ICommand;
```

### Database Queries
Always use typed generics on `db.query<T>()` and `db.queryRandomMessage<T>()`. Access row properties by name, never by string index.

```ts
// ✗ Wrong
const rows = await db.query(sql, [id]);
const val = rows[0]["count"] as string;

// ✓ Correct
const rows = await db.query<{ count: string }>(sql, [id]);
const val = rows[0].count;
```

### Error Handling
All catch blocks must log via `logger.error(toError(err))`. Never log the raw `err` variable. Never swallow errors silently (empty catch is only allowed by ESLint when there is a documented reason).

```ts
// ✗ Wrong
catch (err) { logger.error(err); }

// ✓ Correct
catch (err) { logger.error(toError(err)); }
```

### Logger Interface
`ILogger.error` accepts `string | Error` only — not variadic args. Compose messages into a single string:

```ts
// ✗ Wrong
logger.warn("Failed fetch:", err);

// ✓ Correct
logger.warn(`Failed fetch: ${err instanceof Error ? err.message : String(err)}`);
```

### Async Patterns
Use `async/await` consistently. Do not mix `.then()/.catch()` chains with `await` in the same function. Do not pass callbacks to database methods — use the returned `Promise`.

---

## Class and OOP Conventions

### `override` keyword
Any method that overrides a base class method must be explicitly marked `override`. The lister subclasses (`CountLister`, `EmoteLister`, etc.) are the reference example.

```ts
// ✓ Correct
override async total(message: BotMessage): Promise<void> { ... }
override async mention(message: BotMessage, mention: { id: string }): Promise<void> { ... }
```

### Private fields
All class fields that are not part of the public API must be `private`. Never leave fields untyped or public by default.

### Constructor injection
Services receive dependencies through the constructor, not by calling singletons inside methods. 

---

## Testing

### Framework
Vitest with Node environment. No globals (`describe`, `it`, `expect` are always imported explicitly).

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
```

### Test file location
Co-located with the source file: `foo.ts` → `foo.test.ts`. Tests are excluded from the `tsc` build via `tsconfig.json`.

### Mocking
Use `vi.fn()` for mock functions. Mock external dependencies (e.g. `Pool`, `discord.Client`) by constructing minimal typed objects with `as unknown as Pool`. The mock helper pattern:

```ts
function makeMockPool(rows: Record<string, unknown>[] = []): Pool {
    return { query: vi.fn().mockResolvedValue({ rows }) } as unknown as Pool;
}
```

Only the test helper factory may use `as unknown as`. Never in production code.

### Test structure
- One `describe` block per exported function or class method group
- Test names describe the behaviour, not the implementation: `"blocks a second attempt within the cooldown window"` not `"cooldown check works"`
- Use `beforeEach`/`afterEach` for setup/teardown. Use `vi.useFakeTimers()` when testing time-dependent logic.
- Always clean up created files/directories in `afterEach`.

### What to test
- Pure functions: full branch coverage
- Classes: one `describe` per public method, test the observable contract
- Do not test private implementation details
- Do not test third-party library behaviour

---

## File & Module Conventions

### Imports
- `import type` for type-only imports
- Node built-ins use the `node:` prefix only in `commandLoader.ts` (where `node:module` is needed for `createRequire`)
- Third-party imports before local imports
- Never use `require()` in source files

### Naming
- Classes: `PascalCase`
- Interfaces: `I` prefix + `PascalCase` (e.g. `ICommand`, `IDatabase`)
- Types and type aliases: `PascalCase` (e.g. `SqlParam`, `BotMessage`)
- Functions and variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE` for module-level magic values (e.g. `SPEAK_MIN_TIMEOUT_MINUTES`)
- Unused parameters: prefix with `_` (e.g. `_args`, `_old`)

### Source structure
```
src/
  commands/          # ICommand implementations (one per file)
    admincommands/   # Admin-only ICommand implementations
    clcommands/      # IClCommand implementations (commandline)
    dmcommands/      # DM-only ICommand implementations
    listers/         # Lister subclasses
  interfaces/        # All shared interfaces and types
  systems/           # Services, core logic, infrastructure
  json/              # Static data (card_data, emoji, words, etc.)
```

### Command registration
Commands are auto-loaded by `commandLoader.ts` via `createRequire`. A command file's default export is discovered by filename. No manual registration needed.

---

## What Copilot Must Never Generate

- Comments or JSDoc in any form
- `any` type in any position
- Direct discord.js type usage outside of `eventListener.ts`, `bot.ts`, `messageAdapter.ts`
- `as string`, `as number`, or other primitive casts — use typed generics
- `.then()/.catch()` chains — use `async/await`
- Callback-style async — use the returned Promise
- `console.log` — use `logger.console()`, `logger.debug()`, `logger.info()` etc.
- Raw `err` passed to logger — always `toError(err)`
- Bare `as unknown as X` outside of `messageAdapter.ts` (test mocks are the one exception)
