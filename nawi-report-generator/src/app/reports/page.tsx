import Link from "next/link";
import prisma from "@/lib/prisma";
import { FileText, Plus } from "lucide-react";
import clsx from "clsx";
import { DeleteButton } from "@/components/DeleteButton";
import { DemoButton } from "@/components/DemoButton";
import { SearchInput } from "@/components/SearchInput";
import { PageHeader, ResultBadge, StatusBadge } from "@/components/ui";
import { formatDate, reportNo } from "@/lib/format";

const FILTERS = [
  { key: "", label: "All" },
  { key: "open", label: "In progress" },
  { key: "pass", label: "Passed" },
  { key: "fail", label: "Failed" },
] as const;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ q?: string; show?: string }> }) {
  const { q: rawQ, show = "" } = await searchParams;
  const q = rawQ?.trim() ?? "";

  const statusFilter =
    show === "open" ? { status: "Draft" } : show === "pass" ? { result: "Pass" } : show === "fail" ? { result: "Fail" } : {};

  const reports = await prisma.testReport.findMany({
    where: {
      ...statusFilter,
      ...(q && {
        OR: [
          { testerName: { contains: q } },
          // "NAWI/2026/1A2B3C" or just "1a2b3c"
          { id: { startsWith: q.split("/").pop()!.toLowerCase() } },
          { instrument: { manufacturer: { contains: q } } },
          { instrument: { model: { contains: q } } },
          { instrument: { serialNumber: { contains: q } } },
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
    include: { instrument: true },
  });
  const total = await prisma.testReport.count();

  const href = (key: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (key) p.set("show", key);
    const s = p.toString();
    return s ? `/reports?${s}` : "/reports";
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Test reports"
        subtitle={`${total} in the register`}
        actions={
          <Link href="/reports/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            New report
          </Link>
        }
      />

      {total === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 font-medium text-slate-900">No reports yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Start a report for a registered instrument, or load sample data to see a finished one.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/reports/new" className="btn-primary"><Plus className="h-4 w-4" /> New report</Link>
            <DemoButton />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3">
            <div className="w-full sm:max-w-sm">
              <SearchInput initial={q} placeholder="Search instrument, serial, observer or report N°" />
            </div>
            <div className="flex gap-1 text-sm">
              {FILTERS.map((f) => (
                <Link
                  key={f.key}
                  href={href(f.key)}
                  className={clsx("rounded-md px-3 py-1.5", show === f.key ? "bg-navy-50 font-medium text-navy-800" : "text-slate-600 hover:bg-slate-50")}
                >
                  {f.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Report N°</th>
                  <th className="th">Date</th>
                  <th className="th">Instrument</th>
                  <th className="th">Observer</th>
                  <th className="th">Status</th>
                  <th className="th">Result</th>
                  <th className="th"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">No reports match this search.</td>
                  </tr>
                )}
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link href={`/reports/${report.id}`} className="font-mono text-navy-600 hover:underline">
                        {reportNo(report.id, report.createdAt)}
                      </Link>
                    </td>
                    <td className="td tabular text-slate-600">{formatDate(report.createdAt)}</td>
                    <td className="td">
                      <div className="text-slate-900">{report.instrument.manufacturer} {report.instrument.model}</div>
                      <div className="font-mono text-xs text-slate-500">SN {report.instrument.serialNumber}</div>
                    </td>
                    <td className="td text-slate-600">{report.testerName}</td>
                    <td className="td"><StatusBadge status={report.status} /></td>
                    <td className="td"><ResultBadge result={report.result} /></td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/reports/${report.id}`} className="text-sm font-medium text-navy-600 hover:text-navy-800">
                          {report.status === "Completed" ? "Open" : "Continue"}
                        </Link>
                        <DeleteButton id={report.id} type="report" label={reportNo(report.id, report.createdAt)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
