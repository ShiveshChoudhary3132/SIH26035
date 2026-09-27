"use client"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { instrumentSchema } from "@/lib/schemas"
import { Field } from "./Field"
import { useUi } from "./Providers"

type In = z.input<typeof instrumentSchema>
type Out = z.output<typeof instrumentSchema>

// R 76-1 Table 3: allowed number of verification intervals n = Max/e,
// and the usual lower limit for Min, per accuracy class.
const CLASS_LIMITS: Record<string, { nMin: number; nMax: number; minInE: number }> = {
  I: { nMin: 50000, nMax: Infinity, minInE: 100 },
  II: { nMin: 100, nMax: 100000, minInE: 20 },
  III: { nMin: 100, nMax: 10000, minInE: 20 },
  IIII: { nMin: 100, nMax: 1000, minInE: 10 },
}

export function InstrumentForm() {
  const router = useRouter()
  const { toast } = useUi()
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<In, unknown, Out>({
    resolver: zodResolver(instrumentSchema),
    defaultValues: { accuracyClass: "III" },
  })

  const [cls, max, min, e] = useWatch({ control, name: ["accuracyClass", "maxCapacity", "minCapacity", "scaleIntervalE"] })
  const maxN = Number(max), minN = Number(min), eN = Number(e)
  const limits = CLASS_LIMITS[String(cls)]
  const n = maxN > 0 && eN > 0 ? Math.round(maxN / eN) : null
  const nWarning = n !== null && limits && (n < limits.nMin || n > limits.nMax)
  const minWarning = minN > 0 && eN > 0 && limits && minN < limits.minInE * eN

  const onSubmit = async (data: Out) => {
    const res = await fetch("/api/instruments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const body = await res.json()
    if (!res.ok) {
      for (const [field, message] of Object.entries(body.fields ?? {})) {
        setError(field as keyof In, { message: message as string })
      }
      toast(body.error ?? "Couldn't save the instrument", { tone: "error" })
      return
    }
    toast("Instrument added", { tone: "success" })
    router.push(`/instruments/${body.id}`)
    router.refresh()
  }

  const num = (name: keyof In) => ({
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
      <fieldset className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-slate-900">Identification</legend>
        <Field id="manufacturer" label="Manufacturer" error={errors.manufacturer?.message}>
          <input id="manufacturer" className="input" aria-invalid={!!errors.manufacturer} {...register("manufacturer")} />
        </Field>
        <Field id="model" label="Model / type" error={errors.model?.message}>
          <input id="model" className="input" aria-invalid={!!errors.model} {...register("model")} />
        </Field>
        <Field id="serialNumber" label="Serial number" error={errors.serialNumber?.message}>
          <input id="serialNumber" className="input" aria-invalid={!!errors.serialNumber} {...register("serialNumber")} />
        </Field>
        <Field id="accuracyClass" label="Accuracy class" error={errors.accuracyClass?.message}>
          <select id="accuracyClass" className="input" {...register("accuracyClass")}>
            <option value="I">I – special</option>
            <option value="II">II – high</option>
            <option value="III">III – medium</option>
            <option value="IIII">IIII – ordinary</option>
          </select>
        </Field>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2">
        <legend className="mb-3 pt-6 text-sm font-semibold text-slate-900">Metrological characteristics</legend>
        <Field id="maxCapacity" label="Maximum capacity, Max" unit="kg" error={errors.maxCapacity?.message}>
          <input {...num("maxCapacity")} />
        </Field>
        <Field
          id="minCapacity"
          label="Minimum capacity, Min"
          unit="kg"
          error={errors.minCapacity?.message}
          hint={minWarning ? <span className="text-saffron-700">Min is normally at least {limits.minInE}e ({limits.minInE * eN} kg) for class {String(cls)}.</span> : undefined}
        >
          <input {...num("minCapacity")} />
        </Field>
        <Field
          id="scaleIntervalE"
          label="Verification scale interval, e"
          unit="kg"
          error={errors.scaleIntervalE?.message}
          hint={
            n !== null ? (
              <span className={nWarning ? "text-saffron-700" : undefined}>
                n = Max / e = {n.toLocaleString("en-IN")}
                {nWarning && ` — outside ${limits.nMin.toLocaleString("en-IN")}${Number.isFinite(limits.nMax) ? `–${limits.nMax.toLocaleString("en-IN")}` : "+"} for class ${String(cls)}`}
              </span>
            ) : undefined
          }
        >
          <input {...num("scaleIntervalE")} />
        </Field>
        <Field id="scaleIntervalD" label="Actual scale interval, d" unit="kg" error={errors.scaleIntervalD?.message} hint="Usually the same as e.">
          <input {...num("scaleIntervalD")} />
        </Field>
        <Field id="capacity" label="Rated capacity (as marked on the plate)" unit="kg" error={errors.capacity?.message}>
          <input {...num("capacity")} />
        </Field>
      </fieldset>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
        <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? "Saving…" : "Save instrument"}
        </button>
      </div>
    </form>
  )
}
