# @mi/shared

Zajednički TypeScript paket za `mi-memories-mobile` i `mi-memories-server`.

Ovdje živi sve što obje strane moraju računati isto:

- domenski tipovi
- Zod sheme za prijavu i AI
- paginacija
- ključ idempotentnosti obavijesti
- datumi godišnjica
- putanja u Storageu

Nema React Nativea, Fastifyja ni tajni.

## Izvoz

| Modul        | Što daje                                                       |
| ------------ | -------------------------------------------------------------- |
| `domain`     | tipovi uspomena, putovanja, chata, obavijesti, AI              |
| `schemas`    | `loginSchema`, `registerSchema`, tijela AI ruta                |
| `dates`      | `nextOccurrence`, `daysUntil`, `sameMonthDay`, `parseDate`     |
| `pagination` | `paginate` s kursorom po `id`                                  |
| `constants`  | `LIMITS`, `occurrenceKey`, `storagePath`, `COUPLE_THREAD_KIND` |
| `ids`        | `createId`                                                     |

Uvoz je jedan: `import { loginSchema, paginate } from '@mi/shared'`.

## Položaj

Tri foldera stoje jedan pored drugog:

```
Documents/Projects/mi-memories-shared
Documents/Projects/mi-memories-mobile
Documents/Projects/mi-memories-server
```

Obje aplikacije uvlače paket preko `file:../mi-memories-shared`.

## Naredbe

```bash
npm install
npm run typecheck
npm test
```

Husky se uključuje tek kad ovaj folder ima vlastiti `.git`. Dok je unutar većeg repozitorija, hookove drži korijen.
