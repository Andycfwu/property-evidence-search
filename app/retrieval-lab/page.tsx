import { AppShell } from "@/components/app-shell";
import { GuideTip } from "@/components/guide-tip";
import { PageHeading } from "@/components/page-heading";
import { RetrievalLab } from "@/components/retrieval-lab";

export const dynamic = "force-dynamic";

export default function RetrievalLabPage() {
  return (
    <AppShell wide>
      <PageHeading
        eyebrow="Retrieval Evaluation"
        title="Retrieval Lab"
        description="Compare the custom inverted index with local vector retrieval and a production-minded hybrid merge."
      />
      <GuideTip title="Where each retrieval mode wins.">
        Exact address, ZIP, and builder identifiers favor lexical retrieval. Natural-language concepts favor vector search. Evidence operations usually benefit from hybrid ranking.
      </GuideTip>
      <RetrievalLab />
    </AppShell>
  );
}
