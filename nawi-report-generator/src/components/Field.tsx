// Label + control + error/hint, with the ids wired up for screen readers.
export function Field({
  id,
  label,
  error,
  hint,
  unit,
  className,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: React.ReactNode
  unit?: string
  className?: string
  children: React.ReactElement
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {unit && <span className="ml-1 font-normal text-slate-400">({unit})</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}
