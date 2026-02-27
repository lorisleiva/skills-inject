# skills-inject

CLI tool that injects skill summaries from INJECT.md files into agent instruction files.

## Commands

- `npm test` — run tests (vitest)
- `npm run typecheck` — type-check (tsc --noEmit)
- `npm run build` — bundle CLI (tsup -> dist/cli.js)

## Architecture

Entry: `src/cli.ts` -> `config.ts` (resolution) -> `prompt.ts` (interactive prompts).
Core: `scan.ts` (find INJECT.md files) -> `frontmatter.ts` (parse) -> `inject.ts` (write).
Types: `src/types.ts` — all shared interfaces.

## Conventions

- ESM-only (`"type": "module"`), bundled with tsup, zero runtime dependencies.
- `@clack/prompts` + `picocolors` for CLI UX (devDeps, bundled in).
- `gray-matter` for frontmatter parsing (CJS — requires `createRequire` shim in tsup banner).
- Tests in `tests/`, using vitest. Inject output tests use exact string matching (`.toBe()` with template literals).
- Priority is a named tier: `high`, `normal`, or `low` (not numeric).
- Use `npx changeset add --empty` to generate changeset files. Never create them manually.
