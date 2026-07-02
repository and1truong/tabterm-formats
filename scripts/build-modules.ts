// Build the formats module into a self-contained runtime artifact under dist/:
//   src/index.tsx -> dist/modules/formats/client.js   (ESM, react external)
//
// A single-module distillation of the tabterm host's scripts/build-modules.ts.
// formats is a client-only module (no server.ts): the YAML ↔ JSON converter's
// server side is the host's own /api/yaml/convert route, not shipped here. It
// imports no CSS and does no dynamic import(), so there's no CSS extraction and
// no code-splitting — one flat client.js. Run from the repo root.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Force the production JSX runtime (react/jsx-runtime, not …/jsx-dev-runtime).
// Bun's transpiler picks dev-vs-prod automatic JSX from NODE_ENV, read once at
// process start — so setting process.env here is too late. The dev runtime emits
// a bare `react/jsx-dev-runtime` import the host import map doesn't map, which
// fails to resolve at runtime. If NODE_ENV isn't already production, re-exec this
// script once with it set so Bun.build() sees it from the start.
if (process.env.NODE_ENV !== "production") {
  const proc = Bun.spawn(["bun", "run", import.meta.path, ...process.argv.slice(2)], {
    env: { ...process.env, NODE_ENV: "production" },
    stdout: "inherit",
    stderr: "inherit",
  });
  process.exit(await proc.exited);
}

const REPO = process.cwd();
const OUT = join(REPO, "dist", "modules", "formats");
const CLIENT_SRC = join(REPO, "src", "index.tsx");

// react/react-dom are provided by the host SPA at runtime (import map →
// host-shims), so the client bundle keeps them external.
const CLIENT_EXTERNALS = ["react", "react-dom", "react/jsx-runtime", "zustand"];

async function buildTailwind(): Promise<string> {
  const input = join(REPO, "src", "tailwind.css");
  const out = join(OUT, "tailwind.tmp.css");
  const proc = Bun.spawn(
    ["bun", "x", "@tailwindcss/cli", "-i", input, "-o", out, "--minify"],
    { cwd: REPO, env: { ...process.env, NODE_ENV: "production" }, stdout: "inherit", stderr: "inherit" },
  );
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`[build] tailwind failed (exit ${code})`);
    process.exit(code || 1);
  }
  const css = readFileSync(out, "utf8");
  rmSync(out, { force: true });
  return css;
}

function cssPrelude(css: string): string {
  return `(function(){try{if(typeof document==="undefined")return;` +
    `if(document.getElementById("tabterm-formats-styles"))return;` +
    `var s=document.createElement("style");s.id="tabterm-formats-styles";` +
    `s.textContent=${JSON.stringify(css)};document.head.appendChild(s);}catch(e){}})();\n`;
}

async function buildClient(): Promise<void> {
  const res = await Bun.build({
    entrypoints: [CLIENT_SRC],
    outdir: OUT,
    format: "esm",
    minify: true,
    external: CLIENT_EXTERNALS,
    splitting: false,
    naming: { entry: "client.js" },
  });
  if (!res.success) {
    console.error("[build] client failed:");
    for (const log of res.logs) console.error(log);
    process.exit(1);
  }
  // Fold the module's compiled Tailwind into client.js so it stays self-contained.
  const css = await buildTailwind();
  const out = join(OUT, "client.js");
  writeFileSync(out, cssPrelude(css) + readFileSync(out, "utf8"));
}

// Fresh output dir — drops stale artifacts from a previous build.
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

await buildClient();

console.log(`[build] formats → ${join("dist", "modules", "formats")}/client.js`);
