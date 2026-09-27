"use client"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { reportSchema } from "@/lib/schemas"
import { Field } from "./Field"
import { useUi } from "./Providers"

type Instrument = {
  id: string
  manufacturer: string
  model: string
  serialNumber: string
}

type In = z.input<typeof reportSchema>
type Out = z.output<typeof reportSchema>

// Reference conditions most labs work to; outside these we warn but still allow.
const LAB_RANGE = { temperature: [18, 25], humidity: [30, 70] } as const

export function ReportForm({ instruments, defaultInstrumentId }: { instruments: Instrument[]; defaultInstrumentId?: string }) {
  const router = useRouter()
  const { toast } = useUi()
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<In, unknown, Out>({
    resolver: zodResolver(reportSchema),
    defaultValues: { instrumentId: defaultInstrumentId ?? "" },
  })

  const [tempRaw, humRaw] = useWatch({ control, name: ["temperature", "humidity"] })
  const outside = (raw: unknown, [lo, hi]: readonly [number, number]) =>
    raw !== undefined && raw !== "" && (Number(raw) < lo || Number(raw) > hi)
  const tempOff = outside(tempRaw, LAB_RANGE.temperature)
  const humOff = outside(humRaw, LAB_RANGE.humidity)

  const onSubmit = async (data: Out) => {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const body = await res.json()
    if (!res.ok) {
      for (const [field, message] of Object.entries(body.fields ?? {})) {
        setError(field as keyof In, { message: message as string })
      }
      toast(body.error ?? "Couldn't start the report", { tone: "error" })
      return
    }
    router.push(`/reports/${body.id}`)
  }

  const num = (name: "temperature" | "humidity" | "pressure") => ({
    id: name,
    type: "number",
    step: "any",
    inputMode: "decimal" as const,
    className: "input tabular",
    "aria-invalid": !!errors[name],
    ...register(name),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field id="instrumentId" label="Instrument" error={errors.instrumentId?.message} className="sm:col-span-2">
          <select id="instrumentId" className="input" aria-invalid={!!errors.instrumentId} {...register("instrumentId")}>
            <option value="" disabled>Select an instrument…</option>
            {instruments.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.manufacturer} {inst.model} — SN {inst.serialNumber}
              </option>
            ))}
          </select>
        </Field>
        <Field id="testerName" label="Observer" error={errors.testerName?.message}>
          <input id="testerName" className="input" autoComplete="name" aria-invalid={!!errors.testerName} {...register("testerName")} />
        </Field>
      </div>

      <fieldset className="grid grid-cols-1 gap-5 border-t border-slate-100 pt-6 sm:grid-cols-3">
        <legend className="mb-1 pt-6 text-sm font-semibold text-slate-900">Conditions at start of test</legend>
        <Field
          id="temperature"
          label="Temperature"
          unit="°C"
          error={errors.temperature?.message}
          hint={tempOff ? <span className="text-saffron-700">Outside the usual 18–25 °C lab range</span> : undefined}
        >
          <input {...num("temperature")} />
        </Field>
        <Field
          id="humidity"
          label="Relative humidity"
          unit="%"
          error={errors.humidity?.message}
          hint={humOff ? <span className="text-saffron-700">Outside the usual 30–70 % range</span> : undefined}
        >
          <input {...num("humidity")} />
        </Field>
        <Field id="pressure" label="Barometric pressure" unit="hPa" error={errors.pressure?.message}>
          <input {...num("pressure")} />
        </Field>
      </fieldset>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
        <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? "Starting…" : "Start testing"}
        </button>
      </div>
    </form>
  )
}
