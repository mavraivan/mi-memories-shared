# @mi/shared

Shared TypeScript package for the M&I mobile app and the M&I API. It holds the rules both sides must compute the same way: domain types, Zod request and response schemas, error codes, cursor pagination, anniversary dates, expense math, and Storage object paths.

Package name: `@mi/shared`, version 0.1.0, private, ESM. Node.js 22.13 or later on the 22 line, 24.3 or later on the 24 line, or 26. `.nvmrc` pins 22. Dependencies are `zod` 4.6.7 and `date-fns` 4.4.0. There is no React Native, no Fastify, and no secrets.

The three repositories sit side by side and both apps import this folder with `file:../mi-memories-shared`:

```
Documents/Projects/mi-memories-shared
Documents/Projects/mi-memories-mobile
Documents/Projects/mi-memories-server
```

| Repository                                                            | How it uses this package                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [mi-memories-shared](https://github.com/mavraivan/mi-memories-shared) | This package. Source is the published entry.                        |
| [mi-memories-mobile](https://github.com/mavraivan/mi-memories-mobile) | Domain types and helpers. Jest maps `@mi/shared` at `src/index.ts`. |
| [mi-memories-server](https://github.com/mavraivan/mi-memories-server) | Request and response schemas, error codes, and `zagrebDay`.         |

Do not copy a type or a schema into either app "just for this call". Add it here, then import it. A second definition will drift, and the phone and the API will disagree about a payload.

## Public entry

`package.json` exports `"."` as `./src/index.ts`. There is no build step. Consumers compile the TypeScript source. `src/index.ts` re-exports every module:

```ts
import {
  LIMITS,
  storagePath,
  chatBody,
  paginate,
  nextOccurrence,
  daysUntil,
  createId,
  type Memory,
} from '@mi/shared';
```

| Module       | Exports                                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| `domain`     | Profiles, spaces, memories, trips, plans, dates, chat, notifications, AI, game, and the `CursorPage` shape |
| `schemas`    | Request bodies, `isoDaySchema`, `localeSchema`, the model output schemas, `aiWritePayloadSchemas`          |
| `contract`   | `API_ERROR_CODES`, `apiErrorSchema`, and a response schema per route                                       |
| `dates`      | `parseDate`, `nextOccurrence`, `daysUntil`, `sameMonthDay`, `zagrebDay`                                    |
| `expenses`   | Month summaries, category totals, fixed costs, badges                                                      |
| `pagination` | `pageBy` with an `(order, id)` cursor, and `paginate` for the mock repository                              |
| `constants`  | `LIMITS`, `COUPLE_THREAD_KIND`, `MOCK_THREAD_ID`, `storagePath`                                            |
| `ids`        | `createId`, `replyWithoutRecordIds`                                                                        |

## Limits

`LIMITS` in `src/constants.ts` is the shared budget. Change it here so both sides move together.

| Key                | Value | Meaning                                              |
| ------------------ | ----- | ---------------------------------------------------- |
| `page`             | 20    | One page of a long list.                             |
| `memoryPage`       | 20    | Default memory page size.                            |
| `chatPage`         | 20    | Chat page size.                                      |
| `aiMessageMax`     | 4000  | Maximum characters on `POST /v1/ai/chat`.            |
| `memoryTextMax`    | 20000 | Largest note field on `POST /v1/ai/memory-title`.    |
| `itineraryDaysMax` | 21    | Upper bound for an itinerary card in stored replies. |

`COUPLE_THREAD_KIND` is `"couple"`. The mock thread id is `thread_main`.

## Domain

`src/domain.ts` is the vocabulary of a space. Identifiers are strings. Dates that cross the wire are ISO strings, not `Date` objects.

A `Memory` belongs to a `spaceId`, has an author, a title, a body, an `eventDate`, optional coordinates, media, people, tags, reactions, and comments. `kind` is `memory`, `trip`, `milestone`, `date`, or `note`. `privacy` is `shared` or `private`. Media kind is `photo`, `video`, `audio`, or `text`.

Surrounding records:

| Type                                           | Role                                                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `Profile`, `Space`                             | The two people and the shared space, including the anniversary date                                                          |
| `Trip`                                         | Destination, range, status (`planned`, `active`, `completed`), checklist, route                                              |
| `LocationPin`                                  | A place: `visited`, `planned`, `wishlist`, or `memory`                                                                       |
| `Plan`, plan items                             | Shared lists: trip, date night, home, purchase, task, dream, other                                                           |
| `ImportantDate`                                | A date with recurrence `none`, `yearly`, `monthly`, or `weekly`                                                              |
| `ReminderRule`                                 | Whether a rule is enabled                                                                                                    |
| `AppNotification`                              | Inbox item. Types include important date, reminder, message, reaction, memory, trip, plan, on this day, AI, game, and system |
| `ChatMessage`                                  | A couple-thread message, with reads and reactions                                                                            |
| `AiMessage`                                    | One turn of the assistant transcript                                                                                         |
| `WishlistItem`, `GameProfile`, `TimelineEntry` | Wish list, the small game, and the chronicle                                                                                 |

`CursorPage<T>` is `{ items, nextCursor }`. `nextCursor` is the last id on the page, or `null` when the page is the end.

## Schemas

`src/schemas.ts` is the Zod 4 contract for bodies that cross the HTTP boundary.

| Schema                  | Shape                                                                          |
| ----------------------- | ------------------------------------------------------------------------------ |
| `chatBody`              | `{ message, locale?, requestId? }`. `requestId` makes a retried question safe. |
| `memoryTextBody`        | Optional `title`, `body`, `location`, `date`, `locale`, all bounded.           |
| `receiptBody`           | `{ storagePath, locale?, mimeType? }`. The path must match `RECEIPT_PATH`.     |
| `deviceBody`            | Device registration. `token`, `platform`, and optional details.                |
| `gameEventBody`         | `{ kind, score?, chapter?, chapterIndex?, title? }`.                           |
| `isoDaySchema`          | `YYYY-MM-DD` of a day the calendar has. `2026-02-31` fails.                    |
| `aiWritePayloadSchemas` | What each kind of AI proposal must hold before the app may offer it.           |

`src/contract.ts` has the other direction: `aiReplySchema`, `receiptResultSchema`, `gameProfileSchema`, `healthSchema` and the rest. The API parses requests with these schemas and turns a `ZodError` into HTTP 400. The server's tests hold every route to the response schemas, and the app can parse with them too.

Every error body is `{ error, code }`. `code` is one of `API_ERROR_CODES` and is what a client should translate. `error` stays a string because the app already on phones reads it with `String(json.error)`, so an object there would show as `[object Object]`.

## Dates

`src/dates.ts` uses `date-fns` and local calendar days.

| Function                                 | Behavior                                                                                                                                                                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parseDate`                              | `parseISO` of a `YYYY-MM-DD` or full ISO string                                                                                                                                                                                                                                                   |
| `nextOccurrence(date, recurrence, now?)` | `none` returns the source date, and so does anything set in the future: nothing repeats before it starts. `weekly` moves to the next matching weekday. `monthly` uses the source day in the current month, then the next month if that day has passed. `yearly` does the same with month and day. |
| `daysUntil(date, now?)`                  | Whole local days from today until that date.                                                                                                                                                                                                                                                      |
| `sameMonthDay(a, b)`                     | True when month and day match, including across years. This is the "on this day" test.                                                                                                                                                                                                            |

Home, reminders, and the yearly countdown all call these functions. Do not reimplement the weekday math in a screen. `zagrebDay` is the couple's calendar day for code that runs on a UTC host, where `isoDay` would be wrong.

`public.next_occurrence` and `expense_overview` repeat these rules in SQL. `test/fixtures/parity.json` holds cases both sides must agree on: `test/parity.test.ts` runs them here, and the server's RLS job runs them against Postgres. Add a case there when a rule changes.

## Pagination

`pageBy(items, cursor, sortKey, limit, direction)` pages by `(order, id)`, so two rows with one timestamp cannot skip each other. `encodeCursor` and `decodeCursor` are the same pair the SQL feeds use. `paginate(items, cursor, limit)` is the older id cursor, used by the mock repository.

## Ids and storage

`createId()` returns a new id for client-side drafts and mock rows.

```ts
storagePath(spaceId, entityType, entityId, fileName);
// "{spaceId}/{entityType}/{entityId}/{fileName}"
```

`storagePath` is the object key inside the space's Storage bucket. The SQL policies assume that prefix.

## What does not belong here

- React components, StyleSheet modules, navigation, MMKV, or Zustand
- Fastify routes, Gemini calls, Firebase Admin, or the Supabase service role
- Environment variables and secrets
- Screen copy and theme tokens

Those stay in `mi-memories-mobile` or `mi-memories-server`. This package may be imported from a test, a script, or a React Native bundle without pulling a server runtime.

## Commands

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run lint        # eslint src test
npm test            # tsx --test test/**/*.test.ts
```

`test/core.test.ts` covers a stable occurrence key, the last-page cursor, same calendar day across years, whole-day `daysUntil`, a space-scoped storage path, and the login schema (trimmed email, short password rejected).

## Git hooks

`scripts/install-hooks.cjs` installs Husky when this folder has its own `.git`.

- `pre-commit` runs Prettier on staged TypeScript and Markdown.
- `pre-push` runs `npm run typecheck` and `npm test`.

`node_modules`, `coverage`, and `.DS_Store` stay untracked.

## Layout

```
src/index.ts        public re-exports
src/domain.ts       types
src/schemas.ts      Zod bodies
src/dates.ts        anniversary math
src/pagination.ts   id cursor
src/constants.ts    limits, keys, paths
src/ids.ts          createId
test/core.test.ts
tsconfig.json
```

## Code style

Formatting, imports, naming, error handling and state patterns are written down in [docs/STYLE.md](docs/STYLE.md).
