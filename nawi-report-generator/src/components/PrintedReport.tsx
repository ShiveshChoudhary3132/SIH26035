import type { Instrument, TestObservation, TestReport } from "@prisma/client"
import {
  TEST_CLAUSES,
  calculateMPE,
  decimalsFor,
  repeatabilityPlan,
  repeatabilitySpread,
  type TestType,
} from "@/lib/oimlHelpers"
import { ZERO_TRACKING } from "@/lib/schemas"
import { formatDate, formatDateTime, reportNo, signed } from "@/lib/format"

// Layout follows the OIML R 76-2 test report format. Rendered on the server,
// printed from the browser (A4, see globals.css).

const SECTIONS: { type: TestType; title: string }[] = [
  { type: "WeighingPerformance", title: "1 WEIGHING PERFORMANCE" },
  { type: "Eccentricity", title: "3 ECCENTRICITY" },
  { type: "Repeatability", title: "5 REPEATABILITY" },
  { type: "Tare", title: "9 TARE (WEIGHING TEST)" },
]

function Box({ on }: { on: boolean }) {
  return (
    <span className="mr-1.5 inline-flex h-3.5 w-3.5 items-center justify-center border border-black align-[-2px] text-[10px] font-bold leading-none">
      {on ? "X" : ""}
    </span>
  )
}

export function PrintedReport({
  report,
  instrument,
  observations,
  qrSvg,
  verifyUrl,
}: {
  report: TestReport
  instrument: Instrument
  observations: TestObservation[]
  qrSvg: string
  verifyUrl: string
}) {
  const e = instrument.scaleIntervalE
  const dp = decimalsFor(e)
  const fmt = (n: number) => n.toFixed(dp)
  const passed = report.result === "Pass"

  const env = [
    { label: "Temp.", start: report.temperature, end: report.temperatureEnd, unit: "°C" },
    { label: "Rel. h.", start: report.humidity, end: report.humidityEnd, unit: "%" },
    { label: "Bar. pres.", start: report.pressure, end: report.pressureEnd, unit: "hPa" },
  ]

  const info: [string, string][] = [
    ["Report N°", reportNo(report.id, report.createdAt)],
    ["Date of test", formatDate(report.date)],
    ["Pattern designation", `${instrument.manufacturer} ${instrument.model}`],
    ["Serial N°", instrument.serialNumber],
    ["Accuracy class", instrument.accuracyClass],
    ["Max / Min", `${instrument.maxCapacity} kg / ${instrument.minCapacity} kg`],
    ["Verification scale interval e", `${e} kg`],
    ["Resolution during test (d)", `${instrument.scaleIntervalD} kg`],
    ["Observer", report.testerName],
    ["Closed on", report.completedAt ? formatDateTime(report.completedAt) : "—"],
  ]

  return (
    <article className="mx-auto max-w-[210mm] bg-white p-10 text-[13px] leading-snug text-black shadow-sm ring-1 ring-slate-200 print:max-w-none print:p-0 print:shadow-none print:ring-0">
      <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-4">
        <div>
          <p className="text-xs uppercase tracking-wider">OIML R 76-2 · Non-automatic weighing instruments</p>
          <h1 className="mt-1 text-xl font-bold uppercase">Test Report</h1>
          <p className="mt-1 text-xs">Tests carried out according to OIML R 76-1 (2006)</p>
        </div>
        <div className="flex items-start gap-3 text-right">
          <div className="text-[10px] leading-tight">
            <p className="font-semibold">Scan to verify</p>
            <p className="mt-1 max-w-[9rem] break-all">{verifyUrl}</p>
          </div>
          <div className="h-24 w-24 shrink-0" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </div>
      </header>

      <section className="mt-5 grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2 print:grid-cols-2">
        {info.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <span className="w-44 shrink-0 font-semibold">{k}:</span>
            <span className="flex-1 border-b border-dotted border-gray-500">{v}</span>
          </div>
        ))}
      </section>

      <section className="mt-5 flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="mb-1.5 font-semibold">Automatic zero-setting and zero-tracking device is:</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {Object.entries(ZERO_TRACKING).map(([k, label]) => (
              <span key={k}><Box on={report.zeroTracking === k} />{label}</span>
            ))}
          </div>
        </div>
        <table className="border-collapse border border-black text-center">
          <thead>
            <tr>
              <th className="border border-black px-2 py-1" />
              <th className="border border-black px-2 py-1">At start</th>
              <th className="border border-black px-2 py-1">At end</th>
              <th className="border border-black px-2 py-1" />
            </tr>
          </thead>
          <tbody className="tabular">
            {env.map((r) => (
              <tr key={r.label}>
                <td className="border border-black px-2 py-1 text-left font-semibold">{r.label}</td>
                <td className="border border-black px-2 py-1">{r.start}</td>
                <td className="border border-black px-2 py-1">{r.end ?? "—"}</td>
                <td className="border border-black px-2 py-1">{r.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-8 space-y-8">
        {SECTIONS.map(({ type, title }) => {
          const rows = observations.filter((o) => o.testType === type)
          if (rows.length === 0) return null
          const sectionPass = rows.every((o) => o.result === "Pass")

          const series =
            type === "Repeatability"
              ? repeatabilityPlan(instrument).map((p) => {
                  const ind = rows.filter((o) => Math.abs(o.load - p.load) < e / 2).map((o) => o.indication)
                  const spread = repeatabilitySpread(ind)
                  const mpe = calculateMPE(p.load, e, instrument.accuracyClass)
                  return { load: p.load, n: ind.length, spread, mpe, ok: spread <= mpe + e * 1e-9 }
                })
              : []
          const ok = sectionPass && series.every((s) => s.ok)

          return (
            <section key={type} className="page-break-inside-avoid">
              <h2 className="mb-2 font-bold">
                {title} <span className="font-normal">({TEST_CLAUSES[type]})</span>
              </h2>
              <table className="w-full border-collapse border border-black text-center tabular">
                <thead className="bg-gray-100">
                  <tr>
                    {type === "Eccentricity" && <th className="border border-black px-2 py-1">Position</th>}
                    {type === "Tare" && <th className="border border-black px-2 py-1">Tare</th>}
                    <th className="border border-black px-2 py-1">Load L</th>
                    <th className="border border-black px-2 py-1">Indication I</th>
                    <th className="border border-black px-2 py-1">Error E = I − L</th>
                    <th className="border border-black px-2 py-1">mpe</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id} className={o.result === "Fail" ? "font-bold" : undefined}>
                      {type === "Eccentricity" && <td className="border border-black px-2 py-0.5 text-left">{o.position}</td>}
                      {type === "Tare" && <td className="border border-black px-2 py-0.5">{o.tareValue != null ? fmt(o.tareValue) : "—"}</td>}
                      <td className="border border-black px-2 py-0.5">{fmt(o.load)}</td>
                      <td className="border border-black px-2 py-0.5">{fmt(o.indication)}</td>
                      <td className="border border-black px-2 py-0.5">{signed(o.error, dp)}{o.result === "Fail" ? " *" : ""}</td>
                      <td className="border border-black px-2 py-0.5">±{fmt(o.mpe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {series.length > 0 && (
                <table className="mt-2 border-collapse border border-black text-center tabular">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-black px-2 py-1">Load</th>
                      <th className="border border-black px-2 py-1">n</th>
                      <th className="border border-black px-2 py-1">I<sub>max</sub> − I<sub>min</sub></th>
                      <th className="border border-black px-2 py-1">mpe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.map((s) => (
                      <tr key={s.load}>
                        <td className="border border-black px-2 py-0.5">{fmt(s.load)}</td>
                        <td className="border border-black px-2 py-0.5">{s.n}</td>
                        <td className="border border-black px-2 py-0.5">{fmt(s.spread)}</td>
                        <td className="border border-black px-2 py-0.5">{fmt(s.mpe)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mt-2 flex gap-6 font-semibold">
                <span><Box on={ok} />Passed</span>
                <span><Box on={!ok} />Failed</span>
              </p>
            </section>
          )
        })}
        <p className="text-xs">All values in kg. * error exceeds mpe.</p>
      </div>

      <section className="page-break-inside-avoid mt-10 border-t-2 border-black pt-5">
        <h2 className="mb-3 font-bold">SUMMARY OF EVALUATION</h2>
        <table className="w-full border-collapse border border-black">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-black px-3 py-1 text-left">Overall determination</th>
              <th className="w-24 border border-black px-3 py-1">Passed</th>
              <th className="w-24 border border-black px-3 py-1">Failed</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black px-3 py-2">
                {passed
                  ? "The instrument meets the requirements of OIML R 76-1 for the tests listed above."
                  : "The instrument does not meet the requirements of OIML R 76-1 for one or more of the tests listed above."}
              </td>
              <td className="border border-black px-3 py-2 text-center text-base font-bold">{passed ? "X" : ""}</td>
              <td className="border border-black px-3 py-2 text-center text-base font-bold">{passed ? "" : "X"}</td>
            </tr>
          </tbody>
        </table>
        {report.remarks && (
          <p className="mt-3"><span className="font-semibold">Remarks: </span>{report.remarks}</p>
        )}

        <div className="mt-20 grid grid-cols-2 gap-10 text-center font-semibold">
          <div><div className="mx-auto mb-2 w-52 border-b border-black" />Observer: {report.testerName}</div>
          <div><div className="mx-auto mb-2 w-52 border-b border-black" />Testing authority (seal)</div>
        </div>
      </section>
    </article>
  )
}
