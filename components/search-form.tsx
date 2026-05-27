"use client";

import { FormEvent, useState } from "react";
import { EvidenceSnippetCard } from "./evidence-snippet-card";

type Result = {
  chunkId: string;
  documentId: string;
  title: string;
  sourceUrl: string | null;
  sourceType: string;
  sourceLayer: string;
  sourceTrust: string;
  snippet: string;
  score: number;
  matchedTerms: string[];
  retrievalMode: "LEXICAL" | "VECTOR" | "HYBRID";
  lexicalScore?: number;
  semanticScore?: number;
};

export function SearchForm() {
  const [mode, setMode] = useState<"LEXICAL" | "VECTOR" | "HYBRID">("LEXICAL");
  const [query, setQuery] = useState("1847 Juniper Hollow Drive Raleigh community builder");
  const [results, setResults] = useState<Result[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setError(null);
    setWarning(null);
    const endpoint = mode === "LEXICAL" ? "/api/search" : mode === "VECTOR" ? "/api/search/vector" : "/api/search/hybrid";
    const response = await fetch(endpoint, {
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
    setWarning(data.warning ?? null);
    setResults(data.results);
  }

  return (
    <>
      <form className="panel mb-6 p-5" onSubmit={search}>
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <p className="atlas-kicker">Evidence Query</p>
          <nav aria-label="Retrieval mode" className="flex flex-wrap gap-2">
            {(["LEXICAL", "VECTOR", "HYBRID"] as const).map((option) => (
              <button
                className={`artifact-tab ${mode === option ? "artifact-tab-active" : ""}`}
                key={option}
                onClick={() => setMode(option)}
                type="button"
              >
                {option === "VECTOR" ? "Semantic" : option.charAt(0) + option.slice(1).toLowerCase()}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input className="input flex-1" aria-label="Search indexed evidence" value={query} onChange={(event) => setQuery(event.target.value)} required />
          <button className="button-primary sm:w-36" disabled={searching}>{searching ? "Retrieving..." : "Search Evidence"}</button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {mode === "LEXICAL" && "Custom inverted-index ranking excels at exact addresses, ZIP codes, and builder identifiers."}
          {mode === "VECTOR" && "Semantic retrieval finds conceptually related language using local MiniLM embeddings and ChromaDB."}
          {mode === "HYBRID" && "Hybrid retrieval merges exact lexical evidence with semantic coverage and boosts agreement."}
        </p>
      </form>
      {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {warning && <p className="mb-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">{warning} Showing lexical matches only.</p>}
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
              sourceLayer={result.sourceLayer}
              sourceTrust={result.sourceTrust}
              sourceUrl={result.sourceUrl}
              title={result.title}
              retrievalMode={result.retrievalMode}
              lexicalScore={result.lexicalScore}
              semanticScore={result.semanticScore}
            />
          ))}
        </section>
      )}
    </>
  );
}
