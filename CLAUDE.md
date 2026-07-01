# tabterm-formats

The **formats** module for [tabterm](https://github.com/and1truong/tabterm), extracted
into its own repository — an umbrella for structured-data tools (JSON Reader + YAML ↔ JSON
converter) behind one module (`id: formats`). A tabterm *module*, not a standalone app: it
has no server/SPA of its own; it activates inside a tabterm host through the
`@tabterm/module-host` contract.

## Toolchain

- **Runtime + package manager: [Bun](https://bun.sh)** (required ≥1.3.5, see `package.json` engines).
  Use `bun` for everything. Do **not** use `npm`, `yarn`, or `pnpm`. Lockfile is `bun.lock`.
- **Typecheck:** `bun run typecheck` (`tsc --noEmit`) — or `make typecheck`.
- **Test:** `bun test` (the build/bundle test) — or `make test`.
- **Full local gate:** `make check` (typecheck + test).
- **Build:** `make build` → `dist/modules/formats/client.js`.
- `make help` lists every target.

## Architecture

The module talks to the host **only** through `@tabterm/module-host` plus its own files —
no deep imports into a host's `src/`. It is **client-only**:

- `src/index.tsx` — client entry: `activate(host)` registers two Tools-menu items and
  their modals plus one palette action, then returns a combined teardown. All client types
  are inline; it imports only React + `lucide-react` + the host contract.
  - **JSON Reader** (modal/menu id `json-reader`) — paste JSON, see it pretty-printed.
    Fully client-side (`JSON.parse` / `JSON.stringify`).
  - **YAML ↔ JSON** (modal/menu id `yaml-json`, palette "YAML ↔ JSON converter") — two-pane
    live converter that POSTs to the **host's** `/api/yaml/convert` route.

### Host dependency: `/api/yaml/convert`

The YAML converter has **no server half in this repo**. It calls the host route
`POST /api/yaml/convert` (server-side `Bun.YAML`), which lives in the tabterm host, not
here. This is a runtime URL contract, not a code import — the module builds and typechecks
standalone, but the converter only works against a host that serves that route. JSON Reader
has no such dependency (pure client).

## Host contract (`@tabterm/module-host`)

- **Vendored** under `vendor/module-host/`, resolved via `file:./vendor/module-host` — no
  registry dependency. Pinned to a tagged snapshot (see `vendor/README.md`).
- Refresh it with `make vendor TABTERM=<path-to-tabterm>` when the contract changes, then
  bump `vendor/module-host/package.json` and re-tag.
- `react` / `react-dom` are **host-provided** at runtime (externalized in the module
  build) — declared here as peer/dev deps for typecheck + tests only. `lucide-react` is a
  real dependency and is bundled into `client.js`.

## Building / consuming this module

This repo ships **source** and builds its own **self-contained** artifact. `make build`
(`scripts/build-modules.ts`) compiles `src/index.tsx` → `dist/modules/formats/client.js`
(ESM, react/react-dom external, no code-splitting, no CSS — Tailwind classes only). There
is no `server.js` — see the host dependency note above.

A tabterm host loads this file via its `modules:` config. See `README.md`.

## Conventions

- Surgical changes; match existing style. The module's clean host-only boundary is the
  whole point of the extraction — never reach back into a host's internals.
- Tests are colocated (`*.test.ts`).
- **Merged at extraction:** `formats` is the union of the former `json-reader` and
  `yaml-json` modules. Each tool kept its original modal/menu id, so nothing about the UX
  changed — only the module id is new.
