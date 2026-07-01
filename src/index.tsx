import type { ClientHost } from "@tabterm/module-host/client";
import { useRef, useState } from "react";
import { Braces, ArrowRightLeft } from "lucide-react";

// Minimal self-contained JSON reader modal. Was the json-reader module; now
// shipped under the umbrella `formats` module alongside the YAML ↔ JSON converter.
function ReaderModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  let parsed: { ok: true; value: unknown } | { ok: false; error: string };
  try { parsed = { ok: true, value: text.trim() ? JSON.parse(text) : null }; }
  catch (e) { parsed = { ok: false, error: (e as Error).message }; }
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div onClick={(e) => e.stopPropagation()} className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl">
        <div className="flex h-12 items-center gap-2 border-b border-[var(--border)] px-4">
          <span className="flex-1 text-sm font-semibold text-[var(--text)]">JSON Reader</span>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)]">✕</button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste JSON here…" spellCheck={false}
            className="mono min-h-0 flex-1 resize-none border-r border-[var(--border)] bg-[var(--bg)] p-3 text-[12.5px] text-[var(--text)] outline-none" />
          <pre className="min-h-0 overflow-auto bg-[var(--bg)] p-3 mono text-[12.5px] text-[var(--text)]">
            {parsed.ok ? JSON.stringify(parsed.value, null, 2) : parsed.error}
          </pre>
        </div>
      </div>
    </div>
  );
}

type Side = "yaml" | "json";
async function convert(direction: "yamlToJson" | "jsonToYaml", source: string) {
  const res = await fetch("/api/yaml/convert", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ direction, source }),
  });
  return res.json() as Promise<{ ok: true; value: string } | { ok: false; error: string }>;
}

function ConverterModal({ onClose }: { onClose: () => void }) {
  const [yaml, setYaml] = useState("");
  const [json, setJson] = useState("");
  const [error, setError] = useState<{ side: Side; message: string } | null>(null);
  const seq = useRef(0);
  const run = (from: Side, source: string) => {
    const id = ++seq.current;
    convert(from === "yaml" ? "yamlToJson" : "jsonToYaml", source).then((r) => {
      if (id !== seq.current) return;
      if (r.ok) { from === "yaml" ? setJson(r.value) : setYaml(r.value); setError(null); }
      else setError({ side: from, message: r.error });
    });
  };
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div onClick={(e) => e.stopPropagation()} className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl">
        <div className="flex h-12 items-center gap-2 border-b border-[var(--border)] px-4">
          <span className="flex-1 text-sm font-semibold text-[var(--text)]">YAML ↔ JSON</span>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)]">✕</button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2">
          <textarea value={yaml} onChange={(e) => { setYaml(e.target.value); run("yaml", e.target.value); }} placeholder="YAML…" spellCheck={false}
            className="mono min-h-0 flex-1 resize-none border-r border-[var(--border)] bg-[var(--bg)] p-3 text-[12.5px] text-[var(--text)] outline-none" />
          <textarea value={json} onChange={(e) => { setJson(e.target.value); run("json", e.target.value); }} placeholder="JSON…" spellCheck={false}
            className="mono min-h-0 flex-1 resize-none bg-[var(--bg)] p-3 text-[12.5px] text-[var(--text)] outline-none" />
        </div>
        {error && <div className="border-t border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--red)]">{error.side}: {error.message}</div>}
      </div>
    </div>
  );
}

// The `formats` module: an umbrella for structured-data tools. Currently ships
// JSON Reader + YAML ↔ JSON (merged from the former json-reader / yaml-json
// modules). Each keeps its own modal/menu id so nothing about the UX changed.
export default function activate(host: ClientHost) {
  const offJson = host.ui.registerUI({
    modal: { id: "json-reader", component: () => <ReaderModal onClose={() => host.ui.closeModal("json-reader")} /> },
    toolsMenuItem: { id: "json-reader", icon: <Braces size={14} className="text-[var(--muted)]" />, label: "JSON Reader", onClick: () => host.ui.openModal("json-reader") },
  });
  const offYaml = host.ui.registerUI({
    modal: { id: "yaml-json", component: () => <ConverterModal onClose={() => host.ui.closeModal("yaml-json")} /> },
    toolsMenuItem: { id: "yaml-json", icon: <ArrowRightLeft size={14} className="text-[var(--muted)]" />, label: "YAML ↔ JSON", onClick: () => host.ui.openModal("yaml-json") },
  });
  const offPalette = host.ui.registerPaletteAction({ id: "yaml-json", title: "YAML ↔ JSON converter", run: () => host.ui.openModal("yaml-json") });
  return () => { offJson(); offYaml(); offPalette(); };
}
