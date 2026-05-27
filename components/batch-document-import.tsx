"use client";

import { useState, type ChangeEvent } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  CSV_IMPORT_FIELDS,
  mapCsvRows,
  parseCsv,
  suggestedMapping,
  type CsvImportField,
  type CsvMapping,
  type ParsedCsv,
} from "@/lib/ingestion/csv-import";

type ImportSummary = {
  rowsReceived: number;
  rowsImported: number;
  documentsCreated: number;
  skippedRows: number;
  vectorIndexed: number;
  vectorFailures: number;
  errors: Array<{ row: number; message: string }>;
};

export function BatchDocumentImport() {
  const router = useRouter();
  const [filename, setFilename] = useState("");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<CsvMapping | null>(null);
  const [readingError, setReadingError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [defaultSourceLayer, setDefaultSourceLayer] = useState("BASELINE");
  const [defaultSourceTrust, setDefaultSourceTrust] = useState("MEDIUM");
  const [defaultSourceName, setDefaultSourceName] = useState("CSV Import");

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setReadingError(null);
    setSummary(null);
    setParsed(null);
    setMapping(null);
    setFilename(file?.name ?? "");
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setReadingError("Choose a CSV file smaller than 2 MB for this prototype.");
      return;
    }

    try {
      const nextParsed = parseCsv(await file.text());
      if (nextParsed.rows.length > 1000) {
        setReadingError("Import up to 1,000 data rows at a time.");
        return;
      }
      setParsed(nextParsed);
      setMapping(suggestedMapping(nextParsed.headers));
    } catch (error) {
      setReadingError(error instanceof Error ? error.message : "Could not read this CSV.");
    }
  }

  function changeMapping(field: CsvImportField, value: string) {
    setMapping((current) => current ? { ...current, [field]: value === "" ? null : Number(value) } : current);
    setSummary(null);
  }

  async function importRows() {
    if (!parsed || !mapping) return;
    setImporting(true);
    setReadingError(null);
    setSummary(null);
    const response = await fetch("/api/documents/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultSourceLayer,
        defaultSourceTrust,
        defaultSourceName,
        rows: mapCsvRows(parsed.rows, mapping),
      }),
    });
    const result = await response.json();
    setImporting(false);
    if (!response.ok) {
      setReadingError(result.error ?? "Batch import could not be completed.");
      return;
    }
    setSummary(result as ImportSummary);
    router.refresh();
  }

  return (
    <section className="panel mb-7 overflow-hidden">
      <div className="border-b border-slate-100 p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="atlas-kicker mb-2">Batch Retrieval</p>
            <h2 className="text-lg font-semibold text-ink">Import source records from CSV</h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
              Upload listing exports, known community reference rows, or QC research data. Each accepted row becomes an indexed evidence document.
            </p>
          </div>
          <a className="button-secondary gap-2" download href="/templates/evidence-import-template.csv">
            <Download size={15} />
            Sample CSV Template
          </a>
        </div>
      </div>
      <div className="space-y-6 p-6">
        <div className="rounded-2xl border border-orange-100 bg-atlas-soft/40 p-5">
          <p className="atlas-kicker mb-2">Baseline Import</p>
          <h3 className="text-sm font-semibold text-ink">Establish permitted source coverage</h3>
          <p className="mt-2 text-xs leading-6 text-slate-600">
            Baseline evidence can come from permitted listing CSV exports, licensed vendor feeds, public records, builder or community pages, and internal dim listing tables. Reviewed or verified internal evidence can later override a broad baseline label.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-sm">
              <span className="label">Default layer</span>
              <select className="input" onChange={(event) => setDefaultSourceLayer(event.target.value)} value={defaultSourceLayer}>
                <option value="BASELINE">Baseline</option>
                <option value="INTERNAL">Internal</option>
                <option value="REVIEWED">Reviewed</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="label">Default trust</span>
              <select className="input" onChange={(event) => setDefaultSourceTrust(event.target.value)} value={defaultSourceTrust}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="VERIFIED">Verified</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="label">Default source name</span>
              <input className="input" onChange={(event) => setDefaultSourceName(event.target.value)} required value={defaultSourceName} />
            </label>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Rows containing mapped verified community or builder values become reviewed/verified override evidence unless that row provides explicit source layer or trust metadata.
          </p>
        </div>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-atlas-soft/35 px-6 py-8 text-center transition hover:bg-atlas-soft/60">
          <Upload className="mb-3 text-atlas" size={25} />
          <span className="text-sm font-semibold text-ink">Upload CSV evidence file</span>
          <span className="mt-1 text-xs text-slate-500">{filename || "CSV files up to 2 MB and 1,000 rows"}</span>
          <input accept=".csv,text/csv" className="sr-only" onChange={chooseFile} type="file" />
        </label>
        {readingError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{readingError}</p>}
        {parsed && mapping && (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-atlas" size={17} />
                <p className="text-sm font-semibold text-ink">Column mapping preview</p>
              </div>
              <p className="text-xs text-slate-500">{parsed.rows.length} rows found / {parsed.headers.length} columns</p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[740px] text-left text-sm">
                <thead className="bg-[#FCFBF8] text-[11px] uppercase tracking-[0.12em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Internal field</th>
                    <th className="px-4 py-3">CSV column</th>
                    <th className="px-4 py-3">Preview value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CSV_IMPORT_FIELDS.map(({ key, label }) => {
                    const column = mapping[key];
                    return (
                      <tr key={key}>
                        <td className="px-4 py-3 font-medium text-ink">{label}</td>
                        <td className="px-4 py-3">
                          <select
                            aria-label={`Map ${label}`}
                            className="input py-2"
                            onChange={(event) => changeMapping(key, event.target.value)}
                            value={column ?? ""}
                          >
                            <option value="">Not mapped</option>
                            {parsed.headers.map((header, index) => (
                              <option key={`${header}-${index}`} value={index}>{header}</option>
                            ))}
                          </select>
                        </td>
                        <td className="max-w-md truncate px-4 py-3 text-xs text-slate-500">
                          {column === null ? "-" : parsed.rows[0]?.[column] || "(empty)"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs leading-5 text-slate-500">
                Mapped text is cleaned, chunked, and indexed immediately. Invalid or empty evidence rows are reported without blocking valid rows.
              </p>
              <button className="button-primary" disabled={importing} onClick={importRows} type="button">
                {importing ? "Importing evidence..." : `Import ${parsed.rows.length} Rows`}
              </button>
            </div>
          </>
        )}
        {summary && (
          <div className="rounded-2xl border border-orange-100 bg-atlas-soft/50 p-5">
            <p className="mb-4 text-sm font-semibold text-ink">Import complete</p>
            <dl className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {[
                ["Rows imported", summary.rowsImported],
                ["Documents created", summary.documentsCreated],
                ["Skipped rows", summary.skippedRows],
                ["Vector indexed", summary.vectorIndexed],
                ["Vector offline", summary.vectorFailures],
                ["Errors", summary.errors.length],
              ].map(([label, value]) => (
                <div className="rounded-xl bg-white px-4 py-3" key={label}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                  <dd className="mt-1 font-mono text-2xl font-semibold text-atlas">{value}</dd>
                </div>
              ))}
            </dl>
            {summary.errors.length > 0 && (
              <ul className="mt-4 space-y-1 text-xs text-rose-700">
                {summary.errors.slice(0, 8).map((error) => <li key={`${error.row}-${error.message}`}>Row {error.row}: {error.message}</li>)}
                {summary.errors.length > 8 && <li>{summary.errors.length - 8} more errors not shown.</li>}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
