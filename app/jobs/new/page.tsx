import { AppShell } from "@/components/app-shell";
import { DemoCopyButton } from "@/components/demo-copy-button";
import { GuideTip } from "@/components/guide-tip";
import { JobForm } from "@/components/job-form";
import { PageHeading } from "@/components/page-heading";
import { DEMO_ADDRESSES } from "@/lib/demo-content";

export const dynamic = "force-dynamic";

export default function NewJobPage() {
  return (
    <AppShell>
      <PageHeading
        eyebrow="Atlas Research Sprint"
        title="New Evidence Run"
        description="Launch a cited builder and community investigation against the indexed source library."
        action={<DemoCopyButton label="Copy demo addresses" text={DEMO_ADDRESSES} />}
      />
      <GuideTip title="Step 3 of 4: submit properties.">
        Paste one address per line. Atlas searches only evidence already staged in the Source Library.
      </GuideTip>
      <JobForm />
    </AppShell>
  );
}
