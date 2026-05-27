import { Check, CircleDashed } from "lucide-react";
import { MetricCard } from "./metric-card";
import { BookOpen, Building2, FileText, MapPinned } from "lucide-react";

export function SprintMonitor({
  filesRead,
  snippetsFound,
  communities,
  builders,
  complete,
}: {
  filesRead: number;
  snippetsFound: number;
  communities: number;
  builders: number;
  complete: boolean;
}) {
  const checks = [
    { title: "Sources pulled", done: filesRead > 0 },
    { title: "Builder checked", done: builders > 0 },
    { title: "Confidence scored", done: snippetsFound > 0 },
    { title: "Review ready", done: complete },
  ];

  return (
    <section>
      <p className="atlas-kicker mb-3">Sprint Monitor</p>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <MetricCard icon={FileText} label="Files read" value={filesRead} />
        <MetricCard icon={BookOpen} label="Snippets" value={snippetsFound} />
        <MetricCard icon={MapPinned} label="Communities" value={communities} />
        <MetricCard icon={Building2} label="Builders" value={builders} />
      </div>
      <div className="panel space-y-2 p-4">
        {checks.map((check) => (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-xs font-medium text-slate-600" key={check.title}>
            {check.title}
            {check.done ? <Check className="text-atlas" size={15} /> : <CircleDashed className="text-slate-300" size={15} />}
          </div>
        ))}
      </div>
    </section>
  );
}
