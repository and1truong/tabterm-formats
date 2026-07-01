# @tabterm/module-formats

The **formats** module for [tabterm](https://github.com/and1truong/tabterm) — an umbrella
for structured-data tools behind one module (`id: formats`). Merges the former
`json-reader` and `yaml-json` modules; more format utilities may be added here later.

- **JSON Reader** — split-pane modal: paste raw JSON, see it pretty-printed. Fully
  client-side. Modal/menu id `json-reader`.
- **YAML ↔ JSON** (also ⌘K → "YAML ↔ JSON converter") — two-pane modal; editing either
  side converts to the other in real time via the host's `POST /api/yaml/convert` route
  (server-side `Bun.YAML`). Modal/menu id `yaml-json`.

Both tools register through the host API from a single `host.ui.registerUI(...)` /
`registerPaletteAction(...)` batch in `activate`.

Extracted from the tabterm monorepo (`modules/formats/`) into its own repository.

## Layout

```
src/index.tsx              Client entry — activate(host): two modals + Tools-menu items
                           + one palette action (all types inline)
build.test.ts              Asserts the built client.js exists and exports activate
scripts/build-modules.ts   Builds the self-contained dist client artifact
```

The module talks to the host **only** through `@tabterm/module-host` (the type-only
contract) plus its own files — no deep imports into tabterm's `src/`. It owns its UI
(`host.ui.registerUI` / `registerPaletteAction`). See `docs/modules.md` in tabterm for the
full host API.

### Host dependency

`formats` is **client-only** — there is no `server.js`. The YAML ↔ JSON converter POSTs to
the tabterm host's `/api/yaml/convert` route (server-side `Bun.YAML`), which is provided by
the host, not this repo. The module builds and typechecks standalone; the converter works
only against a host serving that route. JSON Reader is pure client and has no host
dependency.

## Development

```sh
bun install        # resolves lucide-react + links @tabterm/module-host
bun run typecheck  # tsc --noEmit
bun test           # build/bundle test
make build         # -> dist/modules/formats/client.js
```

`@tabterm/module-host` (the type-only host contract) is **vendored** under
`vendor/module-host/` and resolved via `file:./vendor/module-host` (see `package.json`
devDependencies) — no npm/registry dependency. To update it, run
`make vendor TABTERM=<path-to-tabterm>`.

## Consuming this module in tabterm

Unlike a monorepo module, this repo builds its own artifact. `make build` emits one
self-contained file under `dist/modules/formats/`:

- **`client.js`** — ESM client bundle. `react`/`react-dom` stay external (host-provided at
  runtime); `lucide-react` is inlined. No CSS (Tailwind classes only). Default export is
  `activate(host)`.

Point tabterm's config at it (no `server:` key — this module is client-only):

```yaml
modules:
  - { id: formats, enabled: true,
      client: ~/dirs/tabterm-modules/tabterm-formats/dist/modules/formats/client.js }
```

Rebuild here (`make build`) whenever the module changes; tabterm picks up the new bundle on
its next load.
