"use client";

import { useState } from "react";

const MAX = 4000;

export function SoulEditor({
  initialSoul,
  defaultSoul,
}: {
  initialSoul: string | null;
  defaultSoul: string;
}) {
  const [value, setValue] = useState(initialSoul ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCustomized = (initialSoul ?? "").trim().length > 0;
  const remaining = MAX - value.length;

  async function save(next: string | null) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/soul", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soul: next }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const j = (await res.json()) as { soul: string | null };
      setValue(j.soul ?? "");
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm">
            <div className="font-medium">Custom soul</div>
            <div className="mt-1 text-muted-foreground text-xs">
              {isCustomized
                ? "Active. Replaces the default soul on every request."
                : "Empty. The default soul (shown below) is used."}
            </div>
          </div>
          {savedAt && !error && !saving && (
            <span className="text-emerald-600 text-xs dark:text-emerald-400">
              Saved
            </span>
          )}
        </div>

        <textarea
          aria-label="Agent soul"
          className="mt-4 h-72 w-full resize-y rounded-lg border bg-background px-3 py-2 font-mono text-sm leading-relaxed outline-none focus:border-ring"
          maxLength={MAX}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Write your agent's identity, voice, and rules. Markdown supported. Leave empty to use the default."
          value={value}
        />

        <div className="mt-2 flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            {remaining} / {MAX}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
              disabled={saving || value.trim().length === 0}
              onClick={() => save(null)}
              type="button"
            >
              Reset to default
            </button>
            <button
              className="rounded-md bg-foreground px-3 py-1.5 text-background text-sm hover:opacity-90 disabled:opacity-50"
              disabled={saving}
              onClick={() => save(value.trim() === "" ? null : value)}
              type="button"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-red-600 text-xs dark:text-red-400">{error}</p>
        )}
      </section>

      <section className="rounded-xl border p-5">
        <div className="font-medium text-sm">Default soul (read-only)</div>
        <p className="mt-1 text-muted-foreground text-xs">
          Used when your custom soul is empty. Click into the textarea above
          and paste this if you want a starting point.
        </p>
        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-3 font-mono text-xs leading-relaxed">
          {defaultSoul}
        </pre>
      </section>
    </div>
  );
}
