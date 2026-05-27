"use client";

import { FormEvent, useState } from "react";
import { EvidenceSnippetCard } from "./evidence-snippet-card";

type Result = {
  chunkId: string;
  documentId: string;
  title: string;
  sourceUrl: string | null;
  sourceType: string;
  snippet: string;
  score: number;
  matchedTerms: string[];
};

export function SearchForm() {
  const [query, setQuery] = useState("1847 Juniper Hollow Drive Raleigh community builder");
  const [results, setResults] = useState<Result[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setError(null);
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 12 }),
    });
    const data = await response.json();
    setSearching(false);
    if (!response.ok) {
      setError(data.error ?? "Search failed.");
      return;
    }
    setResults(data.results);
  }

  return (
    <>
      <form className="panel mb-6 p-5" onSubmit={search}>
        <p className="atlas-kicker mb-3">Evidence Query</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input className="input flex-1" aria-label="Search indexed evidence" value={query} onChange={(event) => setQuery(event.target.value)} required />
          <button className="button-primary sm:w-36" disabled={searching}>{searching ? "Retrieving..." : "Search Evidence"}</button>
        </div>
      </form>
      {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {results && (
        <section className="space-y-4">
          <p className="text-sm text-slate-500">{results.length} evidence snippet{results.length === 1 ? "" : "s"} retrieved for operator review</p>
          {results.length === 0 && <div className="panel p-8 text-center text-sm text-slate-500">No indexed evidence matched these signals.</div>}
          {results.map((result) => (
            <EvidenceSnippetCard
              href={`/documents/${result.documentId}`}
              key={result.chunkId}
              score={result.score}
              snippet={result.snippet}
              sourceType={result.sourceType}
              sourceUrl={result.sourceUrl}
              title={result.title}
            />
          ))}
        </section>
      )}
    </>
  );
}
