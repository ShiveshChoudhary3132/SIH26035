import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import prisma from "@/lib/prisma";
import { ReportWorkspace } from "@/components/ReportWorkspace";
import { PrintedReport } from "@/components/PrintedReport";
import { PrintButton } from "@/components/PrintButton";
import { PageHeader, ResultBadge, Spec, StatusBadge } from "@/components/ui";
import { formatDate, formatDateTime, reportNo } from "@/lib/format";
import { qrSvg, verifyUrl } from "@/lib/verify";

export default async function ReportDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const report = await prisma.testReport.findUnique({
    where: { id },
    include: {
      instrument: true,
      // no orderBy: SQLite hands rows back in insertion order, which is reading order
      observations: true,
    },
  });

  if (!report) {
    notFound();
  }

  const { instrument } = report;
  const crumbs = [{ href: "/reports", label: "Reports" }];

  if (report.status === "Completed") {
    const url = await verifyUrl(report.id);
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader
          crumbs={crumbs}
          title={reportNo(report.id, report.createdAt)}
          subtitle={<>Closed {report.completedAt ? formatDateTime(report.completedAt) : ""} · {instrument.manufacturer} {instrument.model}</>}
          actions={
            <>
              <Link href={`/verify/${report.id}`} className="btn-secondary" target="_blank">
                Verification page <ExternalLink className="h-4 w-4" />
              </Link>
              <PrintButton />
            </>
          }
        />
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm print:hidden">
          <ResultBadge result={report.result} />
          <span className="text-slate-600">
            {report.result === "Pass"
              ? "All readings within mpe. Report is locked and ready to print."
              : "One or more readings exceed the mpe. Report is locked."}
          </span>
        </div>
        <PrintedReport
          report={report}
          instrument={instrument}
          observations={report.observations}
          qrSvg={await qrSvg(url)}
          verifyUrl={url}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        crumbs={crumbs}
        title={`${instrument.manufacturer} ${instrument.model}`}
        subtitle={<>{reportNo(report.id, report.createdAt)} · started {formatDate(report.date)} · <StatusBadge status={report.status} /></>}
      />

      <dl className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-4 lg:grid-cols-8">
        <Spec label="Serial N°" value={instrument.serialNumber} />
        <Spec label="Class" value={instrument.accuracyClass} />
        <Spec label="Max / Min" value={`${instrument.maxCapacity} / ${instrument.minCapacity} kg`} />
        <Spec label="e / d" value={`${instrument.scaleIntervalE} / ${instrument.scaleIntervalD} kg`} />
        <Spec label="Observer" value={report.testerName} />
        <Spec label="Temp." value={`${report.temperature} °C`} />
        <Spec label="Rel. humidity" value={`${report.humidity} %`} />
        <Spec label="Pressure" value={`${report.pressure} hPa`} />
      </dl>

      <ReportWorkspace report={report} instrument={instrument} observations={report.observations} />
    </div>
  );
}
