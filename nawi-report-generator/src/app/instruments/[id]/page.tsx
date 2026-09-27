import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { PageHeader, ResultBadge, Spec, StatusBadge } from "@/components/ui";
import { formatDate, reportNo } from "@/lib/format";
import { calculateMPE, eccentricityLoad, weighingLoadPlan } from "@/lib/oimlHelpers";

export default async function InstrumentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const instrument = await prisma.instrument.findUnique({
    where: { id },
    include: {
      reports: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!instrument) {
    notFound();
  }

  const e = instrument.scaleIntervalE;
  const n = Math.round(instrument.maxCapacity / e);
  const plan = weighingLoadPlan(instrument);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        crumbs={[{ href: "/instruments", label: "Instruments" }]}
        title={`${instrument.manufacturer} ${instrument.model}`}
        subtitle={<>Serial N° <span className="font-mono">{instrument.serialNumber}</span> · registered {formatDate(instrument.createdAt)}</>}
        actions={
          <>
            <DeleteButton id={instrument.id} type="instrument" label={`${instrument.model} (SN ${instrument.serialNumber})`} redirectTo="/instruments" />
            <Link href={`/reports/new?instrumentId=${instrument.id}`} className="btn-primary">
              <Plus className="h-4 w-4" />
              New test report
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Metrological characteristics</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
            <Spec label="Accuracy class" value={instrument.accuracyClass} />
            <Spec label="Max" value={`${instrument.maxCapacity} kg`} />
            <Spec label="Min" value={`${instrument.minCapacity} kg`} />
            <Spec label="Verification interval e" value={`${e} kg`} />
            <Spec label="Actual interval d" value={`${instrument.scaleIntervalD} kg`} />
            <Spec label="n = Max / e" value={n.toLocaleString("en-IN")} />
          </dl>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Test loads for this instrument</h2>
          <table className="w-full text-sm tabular">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="pb-1 font-medium">Load (kg)</th>
                <th className="pb-1 text-right font-medium">mpe (kg)</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {plan.map((l) => (
                <tr key={l}>
                  <td className="py-0.5">{l}</td>
                  <td className="py-0.5 text-right">±{calculateMPE(l, e, instrument.accuracyClass)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-500">Eccentricity load: {eccentricityLoad(instrument)} kg (⅓ Max)</p>
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900">Test history</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Report N°</th>
                <th className="th">Date</th>
                <th className="th">Observer</th>
                <th className="th">Status</th>
                <th className="th">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {instrument.reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">This instrument hasn&apos;t been tested yet.</td>
                </tr>
              ) : (
                instrument.reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link href={`/reports/${report.id}`} className="font-mono text-navy-600 hover:underline">{reportNo(report.id, report.createdAt)}</Link>
                    </td>
                    <td className="td tabular">{formatDate(report.createdAt)}</td>
                    <td className="td">{report.testerName}</td>
                    <td className="td"><StatusBadge status={report.status} /></td>
                    <td className="td"><ResultBadge result={report.result} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
