# @mi/shared

Shared TypeScript package for the M&I mobile app and the M&I API. It holds the rules both sides must compute the same way: domain types, Zod request schemas, cursor pagination, anniversary dates, notification idempotency keys, and Storage object paths.

Package name: `@mi/shared`, version 0.1.0, private, ESM. Node.js 22.13 or newer. Dependencies are `zod` 4.6.7 and `date-fns` 4.4.0. There is no React Native, no Fastify, and no secrets.

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
| [mi-memories-server](https://github.com/mavraivan/mi-memories-server) | AI request schemas, `occurrenceKey`, and `storagePath`.             |

Do not copy a type or a schema into either app "just for this call". Add it here, then import it. A second definition will drift, and the phone and the API will disagree about a payload.

## Public entry

`package.json` exports `"."` as `./src/index.ts`. There is no build step. Consumers compile the TypeScript source. `src/index.ts` re-exports every module:

```ts
import {
  LIMITS,
  occurrenceKey,
  storagePath,
  loginSchema,
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
| `schemas`    | `loginSchema`, `registerSchema`, and the AI route bodies                                                   |
| `dates`      | `parseDate`, `nextOccurrence`, `daysUntil`, `sameMonthDay`                                                 |
| `pagination` | `paginate` with an id cursor                                                                               |
| `constants`  | `LIMITS`, `COUPLE_THREAD_KIND`, `MOCK_THREAD_ID`, `occurrenceKey`, `storagePath`                           |
| `ids`        | `createId`                                                                                                 |

## Limits

`LIMITS` in `src/constants.ts` is the shared budget. Change it here so both sides move together.

| Key                | Value | Meaning                                                                           |
| ------------------ | ----- | --------------------------------------------------------------------------------- |
| `pairMembers`      | 2     | A space has two people.                                                           |
| `memoryPage`       | 12    | Default memory page size. The Supabase repository and `paginate` both use it.     |
| `chatPage`         | 80    | Chat page size.                                                                   |
| `aiMessageMax`     | 4000  | Maximum characters on `POST /v1/ai/chat`.                                         |
| `passwordMin`      | 6     | Minimum password length on the unused email schema. Sign-in in the app is Google. |
| `itineraryDaysMax` | 21    | Upper bound for `POST /v1/ai/itinerary`.                                          |

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

| Schema           | Shape                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| `loginSchema`    | `{ email, password }`. Email is trimmed. Password uses `LIMITS.passwordMin`.                           |
| `registerSchema` | Login fields plus `name` (trimmed, at least 2 characters).                                             |
| `chatBody`       | `{ message, threadId?, mode? }`. `threadId` must be a UUID when present.                               |
| `memoryTextBody` | Optional `title`, `body`, `location`, `date`. Used by title and story.                                 |
| `tripIdeasBody`  | Optional `season` and `notes`.                                                                         |
| `itineraryBody`  | Required `destination` (at least 2 characters), `days` from 1 to 21 defaulting to 4, optional `notes`. |
| `recapBody`      | `period` of `month` or `year` (default `year`) and an optional `year`.                                 |

`LoginValues` and `RegisterValues` are the inferred types. The API parses with these schemas and turns a `ZodError` into HTTP 400. The mobile forms can use the same objects with `react-hook-form`.

## Dates

`src/dates.ts` uses `date-fns` and local calendar days.

| Function                                 | Behavior                                                                                                                                                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parseDate`                              | `parseISO` of a `YYYY-MM-DD` or full ISO string                                                                                                                                                                         |
| `nextOccurrence(date, recurrence, now?)` | `none` returns the source date. `weekly` moves to the next matching weekday. `monthly` uses the source day in the current month, then the next month if that day has passed. `yearly` does the same with month and day. |
| `daysUntil(date, now?)`                  | Whole local days from today until that date.                                                                                                                                                                            |
| `sameMonthDay(a, b)`                     | True when month and day match, including across years. This is the "on this day" test.                                                                                                                                  |

Home, reminders, and the yearly countdown all call these functions. Do not reimplement the weekday math in a screen.

## Pagination

```ts
paginate(items, cursor, (limit = LIMITS.memoryPage));
```

`cursor` is the id of the last item the caller already has. The next page starts at the following index. An unknown cursor starts at 0. The result's `nextCursor` is the id of the last returned item when more items remain, otherwise `null`. The input must already be in the order the caller wants to page.

## Ids and storage

`createId()` returns a new id for client-side drafts and mock rows.

```ts
occurrenceKey(scheduledNotificationId, occurrence);
// "{scheduledNotificationId}:{occurrence}"

storagePath(spaceId, entityType, entityId, fileName);
// "{spaceId}/{entityType}/{entityId}/{fileName}"
```

`occurrenceKey` is the idempotency key for a reminder fire. The dispatcher and the database use the same string, so a retry does not send a second push for the same occurrence. `storagePath` is the object key inside the space's Storage bucket. The SQL policies assume that prefix.

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
