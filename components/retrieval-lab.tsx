"use client";

import { useState, type FormEvent } from "react";
import { EvidenceSnippetCard } from "./evidence-snippet-card";

type Result = {
  chunkId: string;
  documentId: string;
  title: string;
  snippet: string;
  sourceUrl: string | null;
  sourceType: string;
  sourceLayer: string;
  sourceTrust: string;
  score: number;
  retrievalMode: string;
  lexicalScore?: number;
  semanticScore?: number;
};

type Comparison = {
  lexical: Result[];
  vector: Result[];
  hybrid: Result[];
  vectorWarning: string | null;
};

const SAMPLE_QUERIES = [
  "1847 Juniper Hollow Drive Raleigh NC 27603 Northline Homes",
  "homes in a planned community with an identified builder",
  "reviewed internal normalization that supersedes a listing label",
];

export function RetrievalLab() {
  const [query, setQuery] = useState(SAMPLE_QUERIES[0]);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function compare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRunning(true);
    setError(null);
    const response = await fetch("/api/search/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 4 }),
    });
    const result = await response.json();
    setRunning(false);
    if (!response.ok) {
      setError(result.error ?? "Retrieval comparison could not be completed.");
      return;
    }
    setComparison(result as Comparison);
  }

  return (
    <>
      <form className="panel mb-6 space-y-4 p-5" onSubmit={compare}>
        <p className="atlas-kicker">Comparison Query</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input className="input flex-1" onChange={(event) => setQuery(event.target.value)} required value={query} />
          <button className="button-primary" disabled={running}>{running ? "Comparing..." : "Run Comparison"}</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_QUERIES.map((sample) => (
            <button className="artifact-tab text-left" key={sample} onClick={() => setQuery(sample)} type="button">{sample}</button>
          ))}
        </div>
      </form>
      {error && <p className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {comparison?.vectorWarning && (
        <p className="mb-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {comparison.vectorWarning} Start Chroma and run the vector backfill to populate semantic results.
        </p>
      )}
      {comparison && (
        <section className="grid gap-5 xl:grid-cols-3">
          <ResultColumn description="Exact address, builder, and ZIP matching." results={comparison.lexical} title="Custom Inverted Index" />
          <ResultColumn description="Fuzzy descriptions and related concepts." results={comparison.vector} title="Vector Search" />
          <ResultColumn description="Preferred evidence retrieval blend." results={comparison.hybrid} title="Hybrid Search" />
        </section>
      )}
    </>
  );
}

function ResultColumn({ title, description, results }: { title: string; description: string; results: Result[] }) {
  return (
    <section className="panel p-4">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mb-4 mt-1 text-xs leading-5 text-slate-500">{description}</p>
      <div className="space-y-3">
        {results.length ? results.map((result) => (
          <EvidenceSnippetCard
            href={`/documents/${result.documentId}`}
            key={result.chunkId}
            lexicalScore={result.lexicalScore}
            retrievalMode={result.retrievalMode}
            score={result.score}
            semanticScore={result.semanticScore}
            snippet={result.snippet}
            sourceLayer={result.sourceLayer}
            sourceTrust={result.sourceTrust}
            sourceType={result.sourceType}
            sourceUrl={result.sourceUrl}
            title={result.title}
          />
        )) : <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No results returned for this mode.</p>}
      </div>
    </section>
  );
}
