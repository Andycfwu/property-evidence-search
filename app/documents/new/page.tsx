import { Building2, FileText, Home, Landmark, NotebookPen } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DemoCopyButton } from "@/components/demo-copy-button";
import { DocumentForm } from "@/components/document-form";
import { GuideTip } from "@/components/guide-tip";
import { PageHeading } from "@/components/page-heading";
import { DEMO_SOURCE_TEXT } from "@/lib/demo-content";

export const dynamic = "force-dynamic";

const sourceTypes = [
  { title: "Listing text", icon: FileText },
  { title: "Builder page", icon: Building2 },
  { title: "Community page", icon: Home },
  { title: "Public record", icon: Landmark },
  { title: "Sales notes", icon: NotebookPen },
];

export default function NewDocumentPage() {
  return (
    <AppShell>
      <PageHeading
        eyebrow="File Browser"
        title="Source Library"
        description="Pull public evidence into Atlas by pasting source text or fetching a readable page for immediate indexing."
        action={<DemoCopyButton label="Copy demo source text" text={DEMO_SOURCE_TEXT} />}
      />
      <GuideTip title="Step 1 of 4: ingest evidence.">
        Copy the demo source text, select <span className="font-medium">Paste raw text</span>, and index it as a source artifact before searching.
      </GuideTip>
      <section className="mb-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {sourceTypes.map(({ title, icon: Icon }) => (
          <div className="panel flex items-center gap-3 p-4" key={title}>
            <span className="rounded-xl bg-atlas-soft p-2 text-atlas"><Icon size={16} /></span>
            <p className="text-xs font-semibold text-slate-600">{title}</p>
          </div>
        ))}
      </section>
      <DocumentForm />
    </AppShell>
  );
}
