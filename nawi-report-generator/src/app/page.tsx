import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, Plus } from "lucide-react";
import prisma from "@/lib/prisma";
import { DemoButton } from "@/components/DemoButton";
import { PageHeader, ResultBadge, StatusBadge } from "@/components/ui";
import { formatDate, reportNo } from "@/lib/format";

const WEEKS = 8;
const DAY = 24 * 3600 * 1000;

export default async function Dashboard() {
  // counts must be read per request, not frozen at build time
  await connection();

  const [instruments, reports] = await Promise.all([
    prisma.instrument.findMany({ include: { reports: { where: { status: "Completed" }, orderBy: { completedAt: "desc" }, take: 1 } } }),
    prisma.testReport.findMany({ orderBy: { createdAt: "desc" }, include: { instrument: true } }),
  ]);

  if (instruments.length === 0) return <Welcome />;

  const closed = reports.filter((r) => r.status === "Completed");
  const open = reports.filter((r) => r.status !== "Completed");
  const passed = closed.filter((r) => r.result === "Pass").length;
  const passRate = closed.length ? Math.round((passed / closed.length) * 100) : null;

  const { weeks, peak, due } = trends(closed, instruments);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard"
        subtitle={`Today, ${formatDate(new Date())}`}
        actions={
          <Link href="/reports/new" className="btn-primary">
            <Plus className="h-4 w-4" /> New report
          </Link>
        }
      />

      <dl className="grid grid-cols-2 divide-slate-100 rounded-lg border border-slate-200 bg-white md:grid-cols-4 md:divide-x">
        <Stat label="Instruments" value={instruments.length} href="/instruments" />
        <Stat label="Reports closed" value={closed.length} href="/reports" />
        <Stat label="In progress" value={open.length} href="/reports?show=open" accent={open.length > 0} />
        <Stat
          label="Pass rate"
          value={passRate === null ? "—" : `${passRate}%`}
          note={closed.length ? `${passed} of ${closed.length}` : "no closed reports"}
        />
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Reports closed, last {WEEKS} weeks</h2>
            <span className="flex gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-navy-600" /> pass</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-red-500" /> fail</span>
            </span>
          </div>
          <div className="mt-4 flex h-36 items-end gap-2">
            {weeks.map((w) => (
              <div key={w.end} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[11px] tabular text-slate-500">{w.pass + w.fail || ""}</span>
                <div className="flex w-full max-w-10 flex-col justify-end overflow-hidden rounded-t-sm" style={{ height: `${((w.pass + w.fail) / peak) * 100}%` }}>
                  <div className="bg-red-500" style={{ flexGrow: w.fail }} />
                  <div className="bg-navy-600" style={{ flexGrow: w.pass }} />
                </div>
                <div className="h-px w-full bg-slate-200" />
                <span className="text-[10px] tabular text-slate-400">{formatDate(new Date(w.end)).slice(0, 5)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Needs attention</h2>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {open.slice(0, 4).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-slate-900">{r.instrument.manufacturer} {r.instrument.model}</span>
                  <span className="text-xs text-slate-500">Testing since {formatDate(r.createdAt)}</span>
                </span>
                <Link href={`/reports/${r.id}`} className="shrink-0 text-sm font-medium text-navy-600 hover:text-navy-800">Continue</Link>
              </li>
            ))}
            {due.slice(0, 4).map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-slate-900">{i.manufacturer} {i.model}</span>
                  <span className="text-xs text-saffron-700">
                    {i.reports[0] ? `Last passed test over a year ago` : "Never tested"}
                  </span>
                </span>
                <Link href={`/reports/new?instrumentId=${i.id}`} className="shrink-0 text-sm font-medium text-navy-600 hover:text-navy-800">Test</Link>
              </li>
            ))}
            {open.length === 0 && due.length === 0 && <li className="py-2 text-slate-500">Nothing pending.</li>}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Recent reports</h2>
          <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-navy-600 hover:text-navy-800">
            All reports <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <tbody className="divide-y divide-slate-100">
              {reports.slice(0, 6).map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="td">
                    <Link href={`/reports/${r.id}`} className="font-mono text-navy-600 hover:underline">{reportNo(r.id, r.createdAt)}</Link>
                  </td>
                  <td className="td text-slate-900">{r.instrument.manufacturer} {r.instrument.model}</td>
                  <td className="td text-slate-500">{r.testerName}</td>
                  <td className="td tabular text-slate-500">{formatDate(r.createdAt)}</td>
                  <td className="td"><StatusBadge status={r.status} /></td>
                  <td className="td"><ResultBadge result={r.result} /></td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr><td className="px-5 py-8 text-center text-sm text-slate-500">No reports yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

type Closed = { result: string | null; completedAt: Date | null; updatedAt: Date };
type WithLast = { reports: Closed[] };

// Weekly pass/fail counts (oldest first) and instruments with no closed
// report in the last 12 months.
function trends<I extends WithLast>(closed: Closed[], instruments: I[]) {
  const now = Date.now();
  const when = (r: Closed) => new Date(r.completedAt ?? r.updatedAt).getTime();
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const end = now - (WEEKS - 1 - i) * 7 * DAY;
    const inWeek = closed.filter((r) => when(r) <= end && when(r) > end - 7 * DAY);
    return { end, pass: inWeek.filter((r) => r.result === "Pass").length, fail: inWeek.filter((r) => r.result === "Fail").length };
  });
  const peak = Math.max(1, ...weeks.map((w) => w.pass + w.fail));
  const due = instruments.filter((i) => !i.reports[0] || now - when(i.reports[0]) > 365 * DAY);
  return { weeks, peak, due };
}

function Stat({ label, value, note, href, accent }: { label: string; value: React.ReactNode; note?: string; href?: string; accent?: boolean }) {
  const body = (
    <>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold tabular ${accent ? "text-saffron-600" : "text-slate-900"}`}>{value}</dd>
      {note && <dd className="text-xs text-slate-400">{note}</dd>}
    </>
  );
  return href ? (
    <Link href={href} className="block px-5 py-4 hover:bg-slate-50">{body}</Link>
  ) : (
    <div className="px-5 py-4">{body}</div>
  );
}

function Welcome() {
  const steps = [
    ["Register an instrument", "Class, Max, Min, e and d from its data plate."],
    ["Start a test report", "Record who is testing and the lab conditions."],
    ["Enter readings", "Load points, eccentricity positions and repeatability series are laid out for you. Error and mpe are checked as you type."],
    ["Close and print", "The R 76-2 report is filled in, with a QR code anyone can scan to check it against the register."],
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Welcome" subtitle="Test reports for non-automatic weighing instruments, as per OIML R 76." />
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <ol className="space-y-4">
          {steps.map(([t, d], i) => (
            <li key={t} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-50 text-sm font-semibold text-navy-700">{i + 1}</span>
              <span>
                <span className="block font-medium text-slate-900">{t}</span>
                <span className="text-sm text-slate-600">{d}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
          <Link href="/instruments/new" className="btn-primary"><Plus className="h-4 w-4" /> Add your first instrument</Link>
          <DemoButton>Try it with sample data</DemoButton>
        </div>
      </div>
    </div>
  );
}
