# Shared package code style

Describes what the code already does.

## Formatting

- Prettier 2.8.8, identical `.prettierrc` in all three repos: `singleQuote`, `trailingComma: all`, `arrowParens: avoid`, `printWidth: 80`.
- `npm run format` writes, `npm run format:check` verifies (server, shared). lint-staged runs Prettier on commit.
- Do not hand-format; never mix a formatting-only change with a logic change.

## Imports

Order: Node builtins and external packages, then `@mi/shared`, then relative paths. Types are inline (`import { x, type Y }`), not a separate `import type` line unless the whole import is types.

## Shared rules

- A type or schema both apps need lives in `@mi/shared`; never copy it.
- No new dependency or rule disable without a reason in the PR.

## Lint

No ESLint here. Gate is `npm run typecheck` (strict `tsc --noEmit`) plus `npm test`.

## Naming

- Files: lowercase single-word modules (`domain.ts`, `pagination.ts`), every module re-exported from `src/index.ts`. No build step; consumers compile the source.
- Zod schemas end in `Schema` or `Body` (`planPayloadSchema`, `receiptBody`); inferred types are PascalCase.
- Constants are UPPER_CASE objects (`LIMITS`).

## Errors

No I/O and no throwing for expected input: validators return Zod results, helpers return `null` or a value. Typed errors belong to the apps, not here.

## State patterns

Pure functions only (dates, pagination, idempotency keys, storage paths); same input gives the same output on phone and API. No React Native, Fastify or secrets.
