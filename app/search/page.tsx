import { AppShell } from "@/components/app-shell";
import { GuideTip } from "@/components/guide-tip";
import { PageHeading } from "@/components/page-heading";
import { SearchForm } from "@/components/search-form";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  return (
    <AppShell>
      <PageHeading
        eyebrow="Retrieval"
        title="Search Evidence"
        description="Surface source snippets ranked by address signals, phrase matches, and indexed term relevance."
      />
      <GuideTip title="Step 2 of 4: verify retrieval.">
        Search an address or builder name to confirm useful indexed snippets are available before starting a run.
      </GuideTip>
      <SearchForm />
    </AppShell>
  );
}
