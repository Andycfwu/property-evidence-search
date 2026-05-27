"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunJobButton({ jobId, rerun }: { jobId: string; rerun: boolean }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    const response = await fetch(`/api/jobs/${jobId}/run`, { method: "POST" });
    const data = await response.json();
    setRunning(false);
    if (!response.ok) {
      setError(data.error ?? "Enrichment failed.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button className="button-primary" onClick={run} disabled={running}>
        {running ? "Atlas is researching..." : rerun ? "Rerun Evidence Sprint" : "Execute Evidence Sprint"}
      </button>
      {error && <p className="text-xs text-rose-700">{error}</p>}
    </div>
  );
}
