import { CircleHelp } from "lucide-react";

export function GuideTip({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="mb-6 flex gap-3 rounded-2xl border border-orange-100 bg-atlas-soft/65 px-4 py-3 text-sm text-slate-600">
      <CircleHelp className="mt-0.5 shrink-0 text-atlas" size={17} />
      <p>
        <span className="font-semibold text-ink">{title}</span>{" "}
        {children}
      </p>
    </aside>
  );
}
