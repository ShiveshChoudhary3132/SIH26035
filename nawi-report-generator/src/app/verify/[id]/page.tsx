import prisma from "@/lib/prisma";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { formatDate, formatDateTime, reportNo } from "@/lib/format";
import { ResultBadge, Spec } from "@/components/ui";

export const metadata = { title: "Verify test report · NAWI TestGen" };

// Opened from the QR code on a printed report. Shows what the register
// holds for that report, so a printout can be checked against it.
export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await prisma.testReport.findUnique({
    where: { id },
    include: { instrument: true, _count: { select: { observations: true } } },
  });

  if (!report) {
    return (
      <Shell tone="bad" icon={<ShieldQuestion className="h-6 w-6" />} title="No matching report">
        <p>There is no report with this reference in the register. The printout may not have been issued by this lab.</p>
      </Shell>
    );
  }

  if (report.status !== "Completed") {
    return (
      <Shell tone="warn" icon={<ShieldAlert className="h-6 w-6" />} title="Report not issued yet">
        <p>{reportNo(report.id, report.createdAt)} exists but is still being tested. A printout of it is not valid.</p>
      </Shell>
    );
  }

  const { instrument } = report;
  return (
    <Shell tone="ok" icon={<ShieldCheck className="h-6 w-6" />} title="Report found in register">
      <p className="mb-5">The details below are what this lab recorded. They should match the printed report exactly.</p>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <Spec label="Report N°" value={reportNo(report.id, report.createdAt)} />
        <Spec label="Result" value={<ResultBadge result={report.result} />} />
        <Spec label="Instrument" value={`${instrument.manufacturer} ${instrument.model}`} />
        <Spec label="Serial N°" value={instrument.serialNumber} />
        <Spec label="Class / Max" value={`${instrument.accuracyClass} / ${instrument.maxCapacity} kg`} />
        <Spec label="e" value={`${instrument.scaleIntervalE} kg`} />
        <Spec label="Tested on" value={formatDate(report.date)} />
        <Spec label="Closed" value={report.completedAt ? formatDateTime(report.completedAt) : "—"} />
        <Spec label="Observer" value={report.testerName} />
        <Spec label="Readings" value={report._count.observations} />
      </dl>
    </Shell>
  );
}

function Shell({ tone, icon, title, children }: { tone: "ok" | "warn" | "bad"; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const colour = { ok: "text-green-700 bg-green-50", warn: "text-saffron-700 bg-saffron-50", bad: "text-red-700 bg-red-50" }[tone];
  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className={`rounded-full p-2 ${colour}`}>{icon}</span>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Report verification</p>
            <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          </div>
        </div>
        <div className="text-sm text-slate-700">{children}</div>
      </div>
    </div>
  );
}
