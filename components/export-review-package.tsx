import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";

export function ExportReviewPackage({ jobId }: { jobId: string }) {
  return (
    <details className="group relative">
      <summary className="button-secondary cursor-pointer list-none gap-2 [&::-webkit-details-marker]:hidden">
        <Download size={16} />
        Export Review Package
        <ChevronDown className="transition-transform group-open:rotate-180" size={14} />
      </summary>
      <div className="absolute right-0 top-full z-10 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-panel">
        <a className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-ink hover:bg-atlas-soft" href={`/api/jobs/${jobId}/export?format=csv`}>
          <FileSpreadsheet className="text-atlas" size={17} />
          Export CSV table
        </a>
        <a className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-ink hover:bg-atlas-soft" href={`/api/jobs/${jobId}/export?format=md`}>
          <FileText className="text-atlas" size={17} />
          Export review brief
        </a>
      </div>
    </details>
  );
}
