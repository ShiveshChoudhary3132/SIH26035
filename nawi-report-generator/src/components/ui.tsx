import Link from "next/link"
import clsx from "clsx"
import { ChevronRight } from "lucide-react"

export function PageHeader({
  title,
  subtitle,
  crumbs,
  actions,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  crumbs?: { href: string; label: string }[]
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 print:hidden">
      {crumbs && (
        <nav className="mb-2 flex items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
          {crumbs.map((c) => (
            <span key={c.href} className="flex items-center gap-1">
              <Link href={c.href} className="hover:text-navy-700">{c.label}</Link>
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const done = status === "Completed"
  return (
    <span className={clsx("inline-flex items-center gap-1.5 text-xs font-medium", done ? "text-slate-600" : "text-saffron-700")}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", done ? "bg-slate-400" : "bg-saffron-500")} />
      {done ? "Closed" : "In progress"}
    </span>
  )
}

export function ResultBadge({ result }: { result: string | null }) {
  if (!result) return <span className="text-slate-300">—</span>
  const pass = result === "Pass"
  return (
    <span
      className={clsx(
        "inline-block rounded px-1.5 py-0.5 text-xs font-semibold",
        pass ? "bg-green-50 text-green-700 ring-1 ring-green-200" : "bg-red-50 text-red-700 ring-1 ring-red-200"
      )}
    >
      {pass ? "Pass" : "Fail"}
    </span>
  )
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("rounded-lg border border-slate-200 bg-white", className)}>{children}</div>
}

export function Spec({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900 tabular">{value}</dd>
    </div>
  )
}
