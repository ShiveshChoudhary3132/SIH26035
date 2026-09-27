import Link from "next/link";
import prisma from "@/lib/prisma";
import { Plus, Scale } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { DemoButton } from "@/components/DemoButton";
import { SearchInput } from "@/components/SearchInput";
import { PageHeader, ResultBadge } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default async function InstrumentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q?.trim() ?? "";

  const instruments = await prisma.instrument.findMany({
    where: q
      ? { OR: [{ manufacturer: { contains: q } }, { model: { contains: q } }, { serialNumber: { contains: q } }] }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      reports: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { reports: true } },
    },
  });
  const total = q ? await prisma.instrument.count() : instruments.length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Instruments"
        subtitle={`${total} registered`}
        actions={
          <Link href="/instruments/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            Add instrument
          </Link>
        }
      />

      {total === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <Scale className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 font-medium text-slate-900">No instruments yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Register a weighing instrument with its class, Max, Min and e. Every test report starts from one.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/instruments/new" className="btn-primary">
              <Plus className="h-4 w-4" /> Add instrument
            </Link>
            <DemoButton />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-3 sm:max-w-sm">
            <SearchInput initial={q} placeholder="Search manufacturer, model or serial no." />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Instrument</th>
                  <th className="th">Serial N°</th>
                  <th className="th">Class</th>
                  <th className="th text-right">Max / Min / e (kg)</th>
                  <th className="th">Last test</th>
                  <th className="th"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {instruments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                      Nothing matches “{q}”.
                    </td>
                  </tr>
                )}
                {instruments.map((instrument) => {
                  const last = instrument.reports[0];
                  return (
                    <tr key={instrument.id} className="hover:bg-slate-50">
                      <td className="td">
                        <Link href={`/instruments/${instrument.id}`} className="font-medium text-slate-900 hover:text-navy-600 hover:underline">
                          {instrument.manufacturer} {instrument.model}
                        </Link>
                        <div className="text-xs text-slate-500">
                          {instrument._count.reports} {instrument._count.reports === 1 ? "report" : "reports"}
                        </div>
                      </td>
                      <td className="td font-mono text-slate-700">{instrument.serialNumber}</td>
                      <td className="td">{instrument.accuracyClass}</td>
                      <td className="td text-right font-mono tabular text-slate-700">
                        {instrument.maxCapacity} / {instrument.minCapacity} / {instrument.scaleIntervalE}
                      </td>
                      <td className="td">
                        {last ? (
                          <span className="flex items-center gap-2">
                            <span className="tabular text-slate-600">{formatDate(last.createdAt)}</span>
                            {last.status === "Completed" ? <ResultBadge result={last.result} /> : <span className="text-xs text-saffron-700">in progress</span>}
                          </span>
                        ) : (
                          <span className="text-slate-400">Never tested</span>
                        )}
                      </td>
                      <td className="td">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/reports/new?instrumentId=${instrument.id}`} className="text-sm font-medium text-navy-600 hover:text-navy-800">
                            New report
                          </Link>
                          <DeleteButton id={instrument.id} type="instrument" label={`${instrument.model} (SN ${instrument.serialNumber})`} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
