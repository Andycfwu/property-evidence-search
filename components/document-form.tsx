"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type IngestionMode = "TEXT" | "URL";

export function DocumentForm() {
  const router = useRouter();
  const [mode, setMode] = useState<IngestionMode>("TEXT");
  const [sourceType, setSourceType] = useState("PASTED_TEXT");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [indexedDocument, setIndexedDocument] = useState<{ id: string; title: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setErrorCode(null);
    setIndexedDocument(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingestionMode: mode,
        title: form.get("title"),
        sourceType,
        sourceUrl: form.get("sourceUrl"),
        rawText: mode === "TEXT" ? form.get("rawText") : "",
      }),
    });
    const result = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(result.error ?? "Document could not be indexed.");
      setErrorCode(result.code ?? null);
      return;
    }
    setIndexedDocument({ id: result.document.id, title: result.document.title });
    router.refresh();
  }

  function chooseMode(nextMode: IngestionMode) {
    setMode(nextMode);
    setSourceType(nextMode === "URL" ? "OTHER" : "PASTED_TEXT");
    setError(null);
    setErrorCode(null);
    setIndexedDocument(null);
  }

  return (
    <form className="panel max-w-4xl space-y-5 p-7" onSubmit={submit}>
      <fieldset>
        <legend className="label">Retrieval method</legend>
        <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
          {[
            { value: "TEXT" as const, label: "Paste raw text" },
            { value: "URL" as const, label: "Fetch from URL" },
          ].map((option) => (
            <button
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                mode === option.value ? "bg-white text-atlas shadow-sm" : "text-slate-600 hover:text-ink"
              }`}
              key={option.value}
              type="button"
              onClick={() => chooseMode(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="title">
            Document title {mode === "URL" && <span className="font-normal text-slate-400">(optional)</span>}
          </label>
          <input className="input" id="title" name="title" required={mode === "TEXT"} placeholder={mode === "URL" ? "Uses page title if empty" : "County permit summary - May release"} />
        </div>
        <div>
          <label className="label" htmlFor="sourceType">Source type</label>
          <select className="input" id="sourceType" name="sourceType" value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
            <option value="PASTED_TEXT">Listing text / pasted source</option>
            <option value="PUBLIC_RECORD">Public record</option>
            <option value="BUILDER_BROCHURE">Builder brochure</option>
            <option value="LISTING_EXPORT">Listing export</option>
            <option value="HOA_NOTICE">HOA notice</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="sourceUrl">
          Source URL {mode === "TEXT" && <span className="font-normal text-slate-400">(optional)</span>}
        </label>
        <input className="input" id="sourceUrl" name="sourceUrl" type="url" required={mode === "URL"} placeholder="https://public-source.example/community-page" />
      </div>
      {mode === "TEXT" ? (
        <div>
          <label className="label" htmlFor="rawText">Raw source text</label>
          <textarea className="input min-h-72 resize-y font-mono text-xs leading-6" id="rawText" name="rawText" required placeholder="Paste publicly sourced evidence text here..." />
          <p className="mt-2 text-xs text-slate-500">Text is cleaned, split into chunks, and indexed immediately after ingestion.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-orange-100 bg-atlas-soft/50 p-4 text-sm leading-6 text-slate-600">
          Only public HTML pages are supported. The app reads useful page text and does not attempt to access login walls, paywalls, captchas, or anti-bot protected content.
        </div>
      )}
      {saving && mode === "URL" && (
        <p className="rounded-xl border border-orange-100 bg-atlas-soft px-4 py-3 text-sm text-atlas">Pulling source page and extracting evidence-ready text...</p>
      )}
      {error && (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <p className="font-medium">{errorCode === "UNSUPPORTED_CONTENT_TYPE" ? "Unsupported content type" : mode === "URL" ? "Fetch failed" : "Indexing failed"}</p>
          <p className="mt-1">{error}</p>
        </div>
      )}
      {indexedDocument && (
        <div className="rounded-xl border border-orange-100 bg-atlas-soft px-4 py-3 text-sm text-atlas">
          <p className="font-medium">Source indexed successfully</p>
          <p className="mt-1">
            <Link className="underline underline-offset-2" href={`/documents/${indexedDocument.id}`}>Open {indexedDocument.title}</Link> to inspect searchable chunks.
          </p>
        </div>
      )}
      <button className="button-primary" disabled={saving}>
        {saving ? (mode === "URL" ? "Fetching URL..." : "Indexing document...") : (mode === "URL" ? "Fetch and index page" : "Index document")}
      </button>
    </form>
  );
}
