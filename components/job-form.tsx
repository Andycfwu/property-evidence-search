"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function JobForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const addresses = String(form.get("addresses"))
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), addresses }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(result.error ?? "Job could not be created.");
      return;
    }
    router.push(`/jobs/${result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="panel max-w-4xl space-y-6 p-7">
      <div className="flex items-center justify-between rounded-xl border border-orange-100 bg-atlas-soft px-4 py-3">
        <div>
          <p className="atlas-kicker">Run Prompt</p>
          <p className="mt-1 text-sm text-ink">Find subdivision, builder, and supporting source evidence.</p>
        </div>
        <span className="rounded-full border border-orange-200 bg-white px-3 py-1 text-[11px] font-semibold text-atlas">Atlas staged</span>
      </div>
      <div>
        <label className="label" htmlFor="name">Run name</label>
        <input className="input" required id="name" name="name" placeholder="Community Evidence Sprint - Raleigh Phase 2" />
      </div>
      <div>
        <label className="label" htmlFor="addresses">Target addresses <span className="font-normal normal-case tracking-normal text-slate-400">(one per line)</span></label>
        <textarea
          className="input min-h-52 resize-y font-mono text-sm leading-7"
          id="addresses"
          name="addresses"
          required
          placeholder={"1847 Juniper Hollow Drive, Raleigh, NC 27603\n62 Lantern Way, Durham, NC 27703"}
        />
        <p className="mt-2 text-xs text-slate-500">Atlas parses available street, city, state, and ZIP signals before searching indexed sources.</p>
      </div>
      <div>
        <label className="label" htmlFor="sourceNotes">Optional source notes</label>
        <textarea
          className="input min-h-24 resize-y text-sm leading-6"
          id="sourceNotes"
          name="sourceNotes"
          placeholder="Focus on builder launch pages, HOA disclosures, or county planning exports..."
        />
        <p className="mt-2 text-xs text-slate-500">Operator context for this sprint; candidate scoring remains evidence-driven.</p>
      </div>
      {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      <button className="button-primary" disabled={saving}>{saving ? "Staging evidence run..." : "Start Evidence Run"}</button>
    </form>
  );
}
