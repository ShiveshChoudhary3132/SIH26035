import Link from "next/link";
import prisma from "@/lib/prisma";
import { ReportForm } from "@/components/ReportForm";
import { DemoButton } from "@/components/DemoButton";
import { PageHeader } from "@/components/ui";

export default async function NewReportPage({ searchParams }: { searchParams: Promise<{ instrumentId?: string }> }) {
  const instruments = await prisma.instrument.findMany({
    select: { id: true, manufacturer: true, model: true, serialNumber: true },
    orderBy: { createdAt: "desc" },
  });

  const resolvedParams = await searchParams;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        crumbs={[{ href: "/reports", label: "Reports" }]}
        title="New test report"
        subtitle="Pick the instrument and record the lab conditions before the first weighing."
      />

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        {instruments.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-600">
            <p>You need a registered instrument first.</p>
            <div className="mt-4 flex justify-center gap-3">
              <Link href="/instruments/new" className="btn-primary">Add instrument</Link>
              <DemoButton />
            </div>
          </div>
        ) : (
          <ReportForm instruments={instruments} defaultInstrumentId={resolvedParams.instrumentId} />
        )}
      </div>
    </div>
  );
}
