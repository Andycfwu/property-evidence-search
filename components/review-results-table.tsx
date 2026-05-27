"use client";

import { Fragment, useMemo, useState, type FormEvent } from "react";
import { CircleCheckBig, ClipboardList, PencilLine } from "lucide-react";
import { EvidenceSnippetCard } from "@/components/evidence-snippet-card";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";

type ReviewStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_MORE_EVIDENCE"
  | "MANUALLY_CORRECTED";

type ReviewDecision = {
  status: ReviewStatus;
  communityOverride: string | null;
  builderOverride: string | null;
  note: string | null;
};

type Candidate = {
  value: string;
  score: number;
};

type Source = {
  id: string;
  score: number;
  snippet: string;
  sourceType: string;
  sourceUrl: string | null;
  title: string;
  sourceLayer: string;
  sourceTrust: string;
};

export type ReviewResultRow = {
  id: string;
  rawAddress: string;
  addressStatus: string;
  confidence?: "High" | "Medium" | "Low";
  baselineCommunity?: string;
  baselineBuilder?: string;
  generatedCommunity?: Candidate;
  generatedBuilder?: Candidate;
  finalCommunity?: string;
  finalBuilder?: string;
  generatedSourceLayer: string;
  generatedSourceTrust: string;
  finalSourceLayer: string;
  finalSourceTrust: string;
  generatedOverrideApplied: boolean;
  generatedOverrideReason: string | null;
  overrideApplied: boolean;
  overrideReason: string | null;
  sources: Source[];
  review: ReviewDecision | null;
};

type Filter = "ALL" | "High" | "Medium" | "Low" | "NEEDS_REVIEW";

const reviewStatuses: Array<{ value: ReviewStatus; label: string }> = [
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "NEEDS_MORE_EVIDENCE", label: "Needs More Evidence" },
  { value: "MANUALLY_CORRECTED", label: "Manually Corrected" },
];

function reviewStatus(row: ReviewResultRow) {
  return row.review?.status ?? "PENDING_REVIEW";
}

function isNeedsReview(row: ReviewResultRow) {
  return ["PENDING_REVIEW", "NEEDS_MORE_EVIDENCE"].includes(reviewStatus(row));
}

function withReview(row: ReviewResultRow, review: ReviewDecision) {
  const corrected = Boolean(review.communityOverride || review.builderOverride);
  return {
    ...row,
    review,
    finalCommunity: review.communityOverride || row.generatedCommunity?.value,
    finalBuilder: review.builderOverride || row.generatedBuilder?.value,
    finalSourceLayer: corrected ? "HUMAN_REVIEW" : row.generatedSourceLayer,
    finalSourceTrust: corrected ? "VERIFIED" : row.generatedSourceTrust,
    overrideApplied: corrected || row.generatedOverrideApplied,
    overrideReason: corrected ? "Human review correction overrides the generated recommendation." : row.generatedOverrideReason,
  };
}

export function ReviewResultsTable({
  complete,
  jobId,
  initialRows,
}: {
  complete: boolean;
  jobId: string;
  initialRows: ReviewResultRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<Filter>("ALL");
  const visibleRows = rows.filter((row) => {
    if (filter === "ALL") return true;
    if (filter === "NEEDS_REVIEW") return isNeedsReview(row);
    return row.confidence === filter;
  });
  const metrics = useMemo(() => ({
    approved: rows.filter((row) => reviewStatus(row) === "APPROVED").length,
    needsReview: rows.filter(isNeedsReview).length,
    corrected: rows.filter((row) => reviewStatus(row) === "MANUALLY_CORRECTED").length,
  }), [rows]);

  function saveDecision(addressId: string, review: ReviewDecision) {
    setRows((current) => current.map((row) => row.id === addressId ? withReview(row, review) : row));
  }

  return (
    <>
      {complete && (
        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <MetricCard icon={CircleCheckBig} label="Approved" value={metrics.approved} detail="Accepted by reviewer" />
          <MetricCard icon={ClipboardList} label="Needs Review" value={metrics.needsReview} detail="Pending or awaiting evidence" />
          <MetricCard icon={PencilLine} label="Manually Corrected" value={metrics.corrected} detail="Reviewer-overridden findings" />
        </section>
      )}
      <section className="panel overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-5">
          <p className="atlas-kicker mb-2">Generated Decision Package</p>
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <h2 className="text-lg font-semibold">Evidence artifacts</h2>
              <p className="mt-1 text-sm text-slate-500">Candidate decisions with citation-ready source excerpts and reviewer disposition.</p>
            </div>
            {complete && (
              <nav aria-label="Filter address findings" className="flex flex-wrap gap-2">
                {([
                  ["ALL", "All"],
                  ["High", "High confidence"],
                  ["Medium", "Medium"],
                  ["Low", "Low"],
                  ["NEEDS_REVIEW", "Needs Review"],
                ] as Array<[Filter, string]>).map(([value, label]) => (
                  <button
                    className={`artifact-tab ${filter === value ? "artifact-tab-active" : ""}`}
                    key={value}
                    onClick={() => setFilter(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </nav>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1660px] w-full text-left text-sm">
            <thead className="bg-[#FCFBF8] text-[11px] uppercase tracking-[0.12em] text-slate-400">
              <tr>
                <th className="px-5 py-4">Address</th>
                <th className="px-5 py-4">Baseline community</th>
                <th className="px-5 py-4">Baseline builder</th>
                <th className="px-5 py-4">Final community</th>
                <th className="px-5 py-4">Final builder</th>
                <th className="px-5 py-4">Final source</th>
                <th className="px-5 py-4">Confidence</th>
                <th className="px-5 py-4">Review</th>
                <th className="px-5 py-4">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {visibleRows.map((row) => (
                <ReviewRow
                  complete={complete}
                  jobId={jobId}
                  key={row.id}
                  onSave={saveDecision}
                  row={row}
                />
              ))}
              {!visibleRows.length && (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-500" colSpan={9}>
                    No address findings match this review filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ReviewRow({
  complete,
  jobId,
  onSave,
  row,
}: {
  complete: boolean;
  jobId: string;
  onSave: (addressId: string, review: ReviewDecision) => void;
  row: ReviewResultRow;
}) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<ReviewStatus>(reviewStatus(row));
  const [communityOverride, setCommunityOverride] = useState(row.review?.communityOverride ?? "");
  const [builderOverride, setBuilderOverride] = useState(row.review?.builderOverride ?? "");
  const [note, setNote] = useState(row.review?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/jobs/${jobId}/addresses/${row.id}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        communityOverride: communityOverride.trim() || null,
        builderOverride: builderOverride.trim() || null,
        note: note.trim() || null,
      }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.error === "Invalid request" ? "Add an override before marking a row manually corrected." : data.error);
      return;
    }
    onSave(row.id, data as ReviewDecision);
    setEditing(false);
  }

  return (
    <Fragment>
      <tr>
        <td className="px-5 py-5">
          <p className="font-semibold text-ink">{row.rawAddress}</p>
          <div className="mt-3"><StatusBadge value={row.addressStatus} /></div>
        </td>
        <td className="px-5 py-5">
          {row.baselineCommunity ? <p className="font-medium">{row.baselineCommunity}</p> : <span className="text-slate-400">Not established</span>}
          <div className="mt-2"><StatusBadge value="BASELINE" /></div>
        </td>
        <td className="px-5 py-5">
          {row.baselineBuilder ? <p className="font-medium">{row.baselineBuilder}</p> : <span className="text-slate-400">Not established</span>}
        </td>
        <td className="px-5 py-5">
          {row.finalCommunity ? (
            <>
              <p className="font-semibold">{row.finalCommunity}</p>
              {row.review?.communityOverride && <p className="mt-1 text-xs text-atlas">Reviewer override</p>}
              {row.generatedCommunity && <p className="mt-2 font-mono text-xs text-slate-500">Generated: {row.generatedCommunity.value} / {row.generatedCommunity.score.toFixed(1)}</p>}
            </>
          ) : <span className="text-slate-400">Pending normalization</span>}
        </td>
        <td className="px-5 py-5">
          {row.finalBuilder ? (
            <>
              <p className="font-semibold">{row.finalBuilder}</p>
              {row.review?.builderOverride && <p className="mt-1 text-xs text-atlas">Reviewer override</p>}
              {row.generatedBuilder && <p className="mt-2 font-mono text-xs text-slate-500">Generated: {row.generatedBuilder.value} / {row.generatedBuilder.score.toFixed(1)}</p>}
            </>
          ) : <span className="text-slate-400">No builder match</span>}
        </td>
        <td className="min-w-52 px-5 py-5">
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={row.finalSourceLayer} />
            <StatusBadge value={row.finalSourceTrust} />
            {row.overrideApplied && <StatusBadge value="OVERRIDE_APPLIED" />}
            {(row.review?.communityOverride || row.review?.builderOverride) && <StatusBadge value="HUMAN_CORRECTED" />}
          </div>
          {row.overrideReason && <p className="mt-3 text-xs leading-5 text-slate-500">{row.overrideReason}</p>}
        </td>
        <td className="px-5 py-5">{row.confidence ? <StatusBadge value={row.confidence} /> : "-"}</td>
        <td className="min-w-52 px-5 py-5">
          <StatusBadge value={reviewStatus(row)} />
          {row.review?.note && <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-500">{row.review.note}</p>}
          {complete && (
            <button className="mt-3 text-xs font-semibold text-atlas hover:text-orange-700" onClick={() => setEditing((open) => !open)} type="button">
              {editing ? "Close decision" : "Review decision"}
            </button>
          )}
        </td>
        <td className="max-w-md space-y-3 px-5 py-5">
          {row.sources.length ? row.sources.map((source) => (
            <EvidenceSnippetCard key={source.id} {...source} />
          )) : <span className="text-slate-400">Execute sprint to generate citations.</span>}
        </td>
      </tr>
      {editing && (
        <tr className="bg-[#FCFBF8]">
          <td className="px-5 py-5" colSpan={9}>
            <form className="grid gap-4 xl:grid-cols-[210px_1fr_1fr_1.4fr_auto] xl:items-end" onSubmit={save}>
              <label className="text-sm">
                <span className="label">Review status</span>
                <select className="input" onChange={(event) => setStatus(event.target.value as ReviewStatus)} value={status}>
                  {reviewStatuses.map((reviewStatusOption) => (
                    <option key={reviewStatusOption.value} value={reviewStatusOption.value}>{reviewStatusOption.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="label">Community override</span>
                <input className="input" onChange={(event) => setCommunityOverride(event.target.value)} placeholder={row.generatedCommunity?.value ?? "Enter community"} value={communityOverride} />
              </label>
              <label className="text-sm">
                <span className="label">Builder override</span>
                <input className="input" onChange={(event) => setBuilderOverride(event.target.value)} placeholder={row.generatedBuilder?.value ?? "Enter builder"} value={builderOverride} />
              </label>
              <label className="text-sm">
                <span className="label">Reviewer note</span>
                <textarea className="input min-h-12 resize-y py-3" onChange={(event) => setNote(event.target.value)} placeholder="Document acceptance or follow-up required" rows={1} value={note} />
              </label>
              <button className="button-primary" disabled={saving} type="submit">{saving ? "Saving..." : "Save decision"}</button>
              {error && <p className="text-xs text-rose-700 xl:col-span-5">{error}</p>}
            </form>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
