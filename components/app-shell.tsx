import { getPrisma } from "@/lib/db/prisma";
import { Sidebar } from "./sidebar";

export async function AppShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  const recentRuns = await getPrisma().evidenceJob.findMany({
    orderBy: { updatedAt: "desc" },
    take: 4,
    select: { id: true, name: true, status: true },
  });

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar recentRuns={recentRuns} />
      <main className={`${wide ? "max-w-[1500px]" : "max-w-6xl"} w-full px-5 py-6 sm:px-8 lg:px-9`}>
        {children}
      </main>
    </div>
  );
}
