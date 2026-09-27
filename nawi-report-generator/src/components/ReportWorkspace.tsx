"use client"
import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import clsx from "clsx"
import { Check, ChevronDown, Trash2, X } from "lucide-react"
import type { Instrument, TestObservation, TestReport } from "@prisma/client"
import {
  TEST_TYPES,
  TEST_LABELS,
  TEST_CLAUSES,
  ECCENTRICITY_POSITIONS,
  calculateMPE,
  decimalsFor,
  eccentricityLoad,
  repeatabilityPlan,
  repeatabilitySpread,
  testStatus,
  weighingLoadPlan,
  type TestType,
} from "@/lib/oimlHelpers"
import { signed } from "@/lib/format"
import { ZERO_TRACKING } from "@/lib/schemas"
import { useUi } from "./Providers"

type Props = { report: TestReport; instrument: Instrument; observations: TestObservation[] }

const STEPS: Record<TestType, string[]> = {
  WeighingPerformance: [
    "Zero the instrument, then apply each load point in increasing order.",
    "Record the indication at every point. Unload the same way if you are also checking decreasing loads.",
  ],
  Eccentricity: [
    "Place the eccentricity load (about ⅓ of Max) in the centre, then on each quarter of the load receptor.",
    "Record the indication at every position. Zero between placements if needed.",
  ],
  Repeatability: [
    "Apply the same load repeatedly, removing it completely between weighings.",
    "The spread (highest − lowest indication) at each load must stay within the mpe for that load.",
  ],
  Tare: [
    "Set a tare weight on the receptor and press tare so the display reads zero.",
    "Apply the test load and record the net indication.",
  ],
}

const IMAGES: Record<TestType, string[]> = {
  WeighingPerformance: ["/images/weighing_1.jpg", "/images/weighing_2.jpg"],
  Eccentricity: ["/images/eccentricity_1.jpg", "/images/eccentricity_2.jpg"],
  Repeatability: ["/images/repeatability_1.jpg", "/images/repeatability_2.jpg"],
  Tare: ["/images/tare_1.jpg", "/images/tare_2.jpg"],
}

export function ReportWorkspace({ report, instrument, observations: initialObs }: Props) {
  const router = useRouter()
  const { toast } = useUi()
  const e = instrument.scaleIntervalE
  const dp = decimalsFor(e)
  const fmt = (n: number) => n.toFixed(dp)
  const same = (a: number, b: number) => Math.abs(a - b) < e / 2

  const [observations, setObservations] = useState(initialObs)
  const statuses = useMemo(
    () => Object.fromEntries(TEST_TYPES.map((t) => [t, testStatus(t, observations, instrument)])) as Record<TestType, ReturnType<typeof testStatus>>,
    [observations, instrument]
  )

  const [activeTab, setActiveTab] = useState<TestType>(() => TEST_TYPES.find((t) => !statuses[t].complete) ?? TEST_TYPES[0])
  const [load, setLoad] = useState(() => defaultLoad(activeTab, initialObs))
  const [indication, setIndication] = useState("")
  const [position, setPosition] = useState<string>(() => nextPosition(initialObs))
  const [tareValue, setTareValue] = useState("")
  const [saving, setSaving] = useState(false)
  const [showSteps, setShowSteps] = useState(false)
  const [zoomed, setZoomed] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const indicationRef = useRef<HTMLInputElement>(null)

  function defaultLoad(tab: TestType, obs: TestObservation[]): string {
    if (tab === "WeighingPerformance") {
      const next = weighingLoadPlan(instrument).find((l) => !obs.some((o) => o.testType === tab && same(o.load, l)))
      return next !== undefined ? String(next) : ""
    }
    if (tab === "Eccentricity") return String(eccentricityLoad(instrument))
    if (tab === "Repeatability") {
      const next = repeatabilityPlan(instrument).find((p) => obs.filter((o) => o.testType === tab && same(o.load, p.load)).length < p.count)
      return String((next ?? repeatabilityPlan(instrument)[0]).load)
    }
    return ""
  }

  function nextPosition(obs: TestObservation[]) {
    return ECCENTRICITY_POSITIONS.find((p) => !obs.some((o) => o.testType === "Eccentricity" && o.position === p)) ?? ECCENTRICITY_POSITIONS[0]
  }

  const switchTab = (tab: TestType) => {
    setActiveTab(tab)
    setLoad(defaultLoad(tab, observations))
    setIndication("")
    setShowSteps(false)
  }

  const loadNum = parseFloat(load)
  const indNum = parseFloat(indication)
  const preview =
    Number.isFinite(loadNum) && Number.isFinite(indNum)
      ? (() => {
          const err = indNum - loadNum
          const mpe = calculateMPE(loadNum, e, instrument.accuracyClass)
          return { err, mpe, pass: Math.abs(err) <= mpe + e * 1e-9 }
        })()
      : null
  const outOfRange = Number.isFinite(loadNum) && (loadNum > instrument.maxCapacity || (loadNum > 0 && loadNum < instrument.minCapacity))

  async function post(body: Record<string, unknown>) {
    const res = await fetch(`/api/reports/${report.id}/observations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Couldn't save the reading")
    return data as TestObservation
  }

  async function addReading(ev: React.FormEvent) {
    ev.preventDefault()
    if (!preview) return
    setSaving(true)
    try {
      const saved = await post({
        testType: activeTab,
        load: loadNum,
        indication: indNum,
        position: activeTab === "Eccentricity" ? position : null,
        tareValue: activeTab === "Tare" && tareValue !== "" ? parseFloat(tareValue) : null,
      })
      const next = [...observations, saved]
      setObservations(next)
      setIndication("")
      // move on to the next thing the tester will need
      if (activeTab === "WeighingPerformance") setLoad(defaultLoad(activeTab, next))
      if (activeTab === "Repeatability") setLoad(defaultLoad(activeTab, next))
      if (activeTab === "Eccentricity") setPosition(nextPosition(next))
      indicationRef.current?.focus()
    } catch (err) {
      toast((err as Error).message, { tone: "error" })
    } finally {
      setSaving(false)
    }
  }

  async function removeReading(obs: TestObservation) {
    const res = await fetch(`/api/observations?id=${obs.id}`, { method: "DELETE" })
    if (!res.ok) {
      toast((await res.json()).error ?? "Couldn't delete the reading", { tone: "error" })
      return
    }
    setObservations((all) => all.filter((o) => o.id !== obs.id))
    toast(`Reading of ${fmt(obs.load)} kg removed`, {
      action: {
        label: "Undo",
        onClick: async () => {
          try {
            const restored = await post({
              testType: obs.testType,
              load: obs.load,
              indication: obs.indication,
              position: obs.position,
              tareValue: obs.tareValue,
            })
            setObservations((all) => [...all, restored])
          } catch (err) {
            toast((err as Error).message, { tone: "error" })
          }
        },
      },
    })
  }

  const rows = observations.filter((o) => o.testType === activeTab)
  const completeCount = TEST_TYPES.filter((t) => statuses[t].complete).length
  const allComplete = completeCount === TEST_TYPES.length

  return (
    <div className="space-y-6">
      {/* Test tabs double as the progress checklist */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4" role="tablist">
        {TEST_TYPES.map((t) => {
          const s = statuses[t]
          const active = t === activeTab
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              onClick={() => switchTab(t)}
              className={clsx(
                "rounded-md border px-3 py-2.5 text-left transition-colors",
                active ? "border-navy-700 bg-navy-700 text-white" : "border-slate-200 bg-white hover:border-navy-300"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{TEST_LABELS[t]}</span>
                {s.complete && s.failed === 0 && <Check className={clsx("h-4 w-4", active ? "text-green-300" : "text-green-600")} />}
                {s.failed > 0 && <span className={clsx("text-xs font-semibold", active ? "text-red-200" : "text-red-600")}>{s.failed} fail</span>}
              </div>
              <div className={clsx("mt-1.5 h-1 overflow-hidden rounded-full", active ? "bg-navy-500" : "bg-slate-100")}>
                <div
                  className={clsx("h-full rounded-full", s.failed > 0 ? "bg-red-500" : s.complete ? "bg-green-500" : "bg-saffron-500")}
                  style={{ width: `${(s.done / s.required) * 100}%` }}
                />
              </div>
              <div className={clsx("mt-1 text-xs tabular", active ? "text-navy-100" : "text-slate-500")}>
                {s.done} of {s.required} {t === "Eccentricity" ? "positions" : t === "WeighingPerformance" ? "load points" : t === "Tare" ? "reading" : "weighings"}
              </div>
            </button>
          )
        })}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {TEST_LABELS[activeTab]} <span className="ml-1 text-sm font-normal text-slate-400">R 76-1, {TEST_CLAUSES[activeTab]}</span>
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">{STEPS[activeTab][0]}</p>
          </div>
          <button onClick={() => setShowSteps((v) => !v)} className="inline-flex items-center gap-1 text-sm font-medium text-navy-600 hover:text-navy-800">
            Procedure <ChevronDown className={clsx("h-4 w-4 transition-transform", showSteps && "rotate-180")} />
          </button>
        </header>

        {showSteps && (
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row">
            <ol className="flex-1 list-decimal space-y-1 pl-5 text-sm text-slate-700">
              {STEPS[activeTab].map((s) => <li key={s}>{s}</li>)}
            </ol>
            <div className="flex gap-2">
              {IMAGES[activeTab].map((src) => (
                <button key={src} onClick={() => setZoomed(src)} className="overflow-hidden rounded border border-slate-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="Procedure illustration" className="h-24 w-24 object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* Left: what to test next */}
          <div>
            {activeTab === "WeighingPerformance" && (
              <LoadPlan
                plan={weighingLoadPlan(instrument)}
                rows={rows}
                selected={loadNum}
                same={same}
                fmt={fmt}
                onPick={(l) => { setLoad(String(l)); indicationRef.current?.focus() }}
              />
            )}
            {activeTab === "Eccentricity" && (
              <Platform
                rows={rows}
                selected={position}
                fmt={fmt}
                onPick={(p) => { setPosition(p); indicationRef.current?.focus() }}
              />
            )}
            {activeTab === "Repeatability" && (
              <RepeatabilitySeries
                instrument={instrument}
                rows={rows}
                selected={loadNum}
                same={same}
                fmt={fmt}
                onPick={(l) => { setLoad(String(l)); indicationRef.current?.focus() }}
              />
            )}
            {activeTab === "Tare" && (
              <p className="text-sm text-slate-600">
                Any tare value up to Max works. Enter the tare you set, the net load applied, and the net indication shown by the instrument.
              </p>
            )}
          </div>

          {/* Right: reading entry with live result */}
          <form onSubmit={addReading} className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {activeTab === "Eccentricity" && (
                <div>
                  <label htmlFor="obs-position" className="mb-1 block text-xs font-medium text-slate-600">Position</label>
                  <select id="obs-position" className="input" value={position} onChange={(ev) => setPosition(ev.target.value)}>
                    {ECCENTRICITY_POSITIONS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
              )}
              {activeTab === "Tare" && (
                <div>
                  <label htmlFor="obs-tare" className="mb-1 block text-xs font-medium text-slate-600">Tare (kg)</label>
                  <input id="obs-tare" className="input tabular" type="number" step="any" min="0" value={tareValue} onChange={(ev) => setTareValue(ev.target.value)} />
                </div>
              )}
              <div>
                <label htmlFor="obs-load" className="mb-1 block text-xs font-medium text-slate-600">{activeTab === "Tare" ? "Net load (kg)" : "Load L (kg)"}</label>
                <input id="obs-load" required className="input tabular" type="number" step="any" min="0" value={load} onChange={(ev) => setLoad(ev.target.value)} />
              </div>
              <div>
                <label htmlFor="obs-ind" className="mb-1 block text-xs font-medium text-slate-600">Indication I (kg)</label>
                <input
                  id="obs-ind"
                  ref={indicationRef}
                  required
                  autoFocus
                  className="input tabular"
                  type="number"
                  step="any"
                  value={indication}
                  onChange={(ev) => setIndication(ev.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div
                aria-live="polite"
                className={clsx(
                  "flex h-10 min-w-0 flex-1 items-center gap-4 rounded-md border px-3 font-mono text-sm tabular",
                  !preview && "border-dashed border-slate-200 text-slate-400",
                  preview?.pass && "border-green-200 bg-green-50 text-green-800",
                  preview && !preview.pass && "border-red-200 bg-red-50 text-red-800"
                )}
              >
                {preview ? (
                  <>
                    <span>E = {signed(preview.err, dp)}</span>
                    <span className="opacity-70">mpe ±{fmt(preview.mpe)}</span>
                    <span className="ml-auto font-sans font-semibold">{preview.pass ? "Within mpe" : "Exceeds mpe"}</span>
                  </>
                ) : (
                  <span className="font-sans">Error and mpe show here as you type</span>
                )}
              </div>
              <button type="submit" disabled={saving || !preview} className="btn-primary">
                {saving ? "Saving…" : "Add reading"}
              </button>
            </div>
            {outOfRange && (
              <p className="text-xs text-saffron-700">
                This load is outside the instrument&apos;s range ({instrument.minCapacity}–{instrument.maxCapacity} kg).
              </p>
            )}

            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th w-10">#</th>
                    {activeTab === "Eccentricity" && <th className="th">Position</th>}
                    {activeTab === "Tare" && <th className="th text-right">Tare</th>}
                    <th className="th text-right">L</th>
                    <th className="th text-right">I</th>
                    <th className="th text-right">E</th>
                    <th className="th text-right">mpe</th>
                    <th className="th"><span className="sr-only">Result</span></th>
                    <th className="th"><span className="sr-only">Delete</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular">
                  {rows.map((o, i) => (
                    <tr key={o.id} className={o.result === "Fail" ? "bg-red-50/60" : undefined}>
                      <td className="td text-slate-400">{i + 1}</td>
                      {activeTab === "Eccentricity" && <td className="td font-sans">{o.position}</td>}
                      {activeTab === "Tare" && <td className="td text-right">{o.tareValue != null ? fmt(o.tareValue) : "–"}</td>}
                      <td className="td text-right">{fmt(o.load)}</td>
                      <td className="td text-right">{fmt(o.indication)}</td>
                      <td className="td text-right">{signed(o.error, dp)}</td>
                      <td className="td text-right text-slate-500">±{fmt(o.mpe)}</td>
                      <td className="td font-sans">
                        <span className={clsx("text-xs font-semibold", o.result === "Pass" ? "text-green-700" : "text-red-700")}>{o.result}</span>
                      </td>
                      <td className="td text-right">
                        <button onClick={() => removeReading(o)} className="text-slate-400 hover:text-red-600" title="Delete reading" aria-label="Delete reading">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-6 text-center font-sans text-sm text-slate-400">No readings yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </form>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
        <p className="text-sm text-slate-600">
          {allComplete
            ? "All tests recorded. Re-read the lab conditions before closing."
            : `${completeCount} of ${TEST_TYPES.length} tests complete. Still to do: ${TEST_TYPES.filter((t) => !statuses[t].complete).map((t) => TEST_LABELS[t]).join(", ")}.`}
        </p>
        <button className="btn-accent" disabled={!allComplete} onClick={() => setClosing(true)}>
          Close report…
        </button>
      </div>

      {closing && (
        <CloseReportDialog
          reportId={report.id}
          start={{ temperature: report.temperature, humidity: report.humidity, pressure: report.pressure }}
          anyFailed={TEST_TYPES.some((t) => statuses[t].failed > 0)}
          onCancel={() => setClosing(false)}
          onDone={() => {
            setClosing(false)
            toast("Report closed", { tone: "success" })
            router.refresh()
          }}
        />
      )}

      {zoomed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={() => setZoomed(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoomed} alt="Procedure illustration" className="max-h-[80vh] rounded-lg bg-white" />
          <button className="absolute right-4 top-4 rounded-full bg-white p-2" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
      )}
    </div>
  )
}

function LoadPlan({ plan, rows, selected, same, fmt, onPick }: {
  plan: number[]; rows: TestObservation[]; selected: number; same: (a: number, b: number) => boolean; fmt: (n: number) => string; onPick: (l: number) => void
}) {
  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">Required load points: Min, the loads where the mpe changes, ½ Max and Max. You can add more.</p>
      <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
        {plan.map((l) => {
          const hit = rows.filter((o) => same(o.load, l))
          const failed = hit.some((o) => o.result === "Fail")
          return (
            <li key={l}>
              <button
                type="button"
                onClick={() => onPick(l)}
                className={clsx("flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50", same(selected, l) && "bg-navy-50")}
              >
                <span className="font-mono tabular">{fmt(l)} kg</span>
                {hit.length === 0 ? (
                  <span className="text-xs text-slate-400">to do</span>
                ) : (
                  <span className={clsx("font-mono text-xs tabular", failed ? "text-red-700" : "text-green-700")}>
                    I = {fmt(hit[hit.length - 1].indication)}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Top view of the load receptor. Front is the side facing the operator.
function Platform({ rows, selected, fmt, onPick }: { rows: TestObservation[]; selected: string; fmt: (n: number) => string; onPick: (p: string) => void }) {
  const spots: Record<string, string> = {
    "Back left": "left-[25%] top-[25%]",
    "Back right": "left-[75%] top-[25%]",
    Centre: "left-1/2 top-1/2",
    "Front left": "left-[25%] top-[75%]",
    "Front right": "left-[75%] top-[75%]",
  }
  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">Tap a position on the receptor, then enter the indication.</p>
      <div className="mx-auto max-w-xs">
        <div className="text-center text-[11px] uppercase tracking-wider text-slate-400">Back</div>
        <div className="relative my-1 aspect-[4/3] rounded-md border-2 border-slate-300 bg-[repeating-linear-gradient(45deg,#f8fafc_0_6px,#f1f5f9_6px_12px)]">
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-300" />
          <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-slate-300" />
          {ECCENTRICITY_POSITIONS.map((p) => {
            const hit = rows.filter((o) => o.position === p).at(-1)
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPick(p)}
                title={p}
                className={clsx(
                  "absolute flex h-14 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded border text-[11px] leading-tight shadow-sm transition",
                  spots[p],
                  !hit && "border-slate-300 bg-white text-slate-600",
                  hit?.result === "Pass" && "border-green-300 bg-green-50 text-green-800",
                  hit?.result === "Fail" && "border-red-300 bg-red-50 text-red-800",
                  selected === p && "ring-2 ring-saffron-500 ring-offset-1"
                )}
              >
                <span className="font-medium">{p}</span>
                <span className="font-mono tabular">{hit ? fmt(hit.indication) : "—"}</span>
              </button>
            )
          })}
        </div>
        <div className="text-center text-[11px] uppercase tracking-wider text-slate-400">Front (operator)</div>
      </div>
    </div>
  )
}

function RepeatabilitySeries({ instrument, rows, selected, same, fmt, onPick }: {
  instrument: Instrument; rows: TestObservation[]; selected: number; same: (a: number, b: number) => boolean; fmt: (n: number) => string; onPick: (l: number) => void
}) {
  const e = instrument.scaleIntervalE
  const plan = repeatabilityPlan(instrument)
  const worstSpread = Math.max(0, ...plan.map((p) => repeatabilitySpread(rows.filter((o) => same(o.load, p.load)).map((o) => o.indication))))
  const enough = plan.some((p) => rows.filter((o) => same(o.load, p.load)).length >= 3)

  // Substitution of standard weights, Legal Metrology (General) Fourth Amendment Rules, 2026
  const substitution = !enough
    ? null
    : worstSpread <= 0.2 * e
      ? "Spread ≤ 0.2e: standard weights may be reduced to 1/5 of Max for substitution."
      : worstSpread <= 0.3 * e
        ? "Spread ≤ 0.3e: standard weights may be reduced to 1/3 of Max for substitution."
        : "Spread > 0.3e: use standard weights of at least 1/2 of Max."

  return (
    <div className="space-y-3">
      {plan.map((p, i) => {
        const series = rows.filter((o) => same(o.load, p.load))
        const spread = repeatabilitySpread(series.map((o) => o.indication))
        const mpe = calculateMPE(p.load, e, instrument.accuracyClass)
        const ok = spread <= mpe + e * 1e-9
        return (
          <button
            key={p.load}
            type="button"
            onClick={() => onPick(p.load)}
            className={clsx("block w-full rounded-md border p-3 text-left hover:border-navy-300", same(selected, p.load) ? "border-navy-500 bg-navy-50" : "border-slate-200")}
          >
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">Series {i + 1} · <span className="font-mono tabular">{fmt(p.load)} kg</span></span>
              <span className="text-xs text-slate-500 tabular">{Math.min(series.length, p.count)}/{p.count}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className={clsx("h-full rounded-full", ok ? "bg-green-500" : "bg-red-500")} style={{ width: `${Math.min(100, (spread / mpe) * 100)}%` }} />
              </div>
              <span className={clsx("font-mono tabular", ok ? "text-slate-600" : "text-red-700")}>
                spread {fmt(spread)} / {fmt(mpe)}
              </span>
            </div>
          </button>
        )
      })}
      {substitution && <p className="rounded-md bg-navy-50 px-3 py-2 text-xs text-navy-800">{substitution}</p>}
    </div>
  )
}

function CloseReportDialog({ reportId, start, anyFailed, onCancel, onDone }: {
  reportId: string
  start: { temperature: number; humidity: number; pressure: number }
  anyFailed: boolean
  onCancel: () => void
  onDone: () => void
}) {
  const { toast } = useUi()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const f = new FormData(ev.currentTarget)
    setSaving(true)
    setErrors({})
    const res = await fetch(`/api/reports/${reportId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(f)),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setErrors(data.fields ?? {})
      toast(data.error ?? "Couldn't close the report", { tone: "error" })
      return
    }
    onDone()
  }

  const field = (name: string, label: string, def: number, unit: string) => (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs font-medium text-slate-600">{label} ({unit})</label>
      <input id={name} name={name} type="number" step="any" defaultValue={def} className="input tabular" aria-invalid={!!errors[name]} />
      {errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name]}</p>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={onCancel}>
      <form onSubmit={submit} onClick={(ev) => ev.stopPropagation()} className="w-full max-w-lg space-y-5 rounded-lg bg-white p-6 shadow-xl">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Close report</h2>
          <p className="mt-1 text-sm text-slate-600">
            Readings are locked after this. Enter the lab conditions at the end of testing (pre-filled with the start values).
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {field("temperatureEnd", "Temp.", start.temperature, "°C")}
          {field("humidityEnd", "Rel. humidity", start.humidity, "%")}
          {field("pressureEnd", "Pressure", start.pressure, "hPa")}
        </div>
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-slate-600">Automatic zero-setting and zero-tracking device</legend>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(ZERO_TRACKING).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input type="radio" name="zeroTracking" value={value} defaultChecked={value === "InOperation"} className="accent-navy-700" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="remarks" className="mb-1 block text-xs font-medium text-slate-600">Remarks (optional)</label>
          <textarea id="remarks" name="remarks" rows={2} className="input h-auto py-2" placeholder={anyFailed ? "e.g. eccentricity error at back right, instrument sent for adjustment" : ""} />
        </div>
        {anyFailed && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            At least one reading exceeds the mpe, so this report will be closed as <strong>Failed</strong>.
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-accent" disabled={saving}>{saving ? "Closing…" : "Close report"}</button>
        </div>
      </form>
    </div>
  )
}
