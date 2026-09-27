"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUi } from "./Providers"

// Creates a sample instrument with one closed report and one nearly finished
// report, then opens the unfinished one.
export function DemoButton({ className = "btn-secondary", children = "Load sample data" }: { className?: string; children?: React.ReactNode }) {
  const router = useRouter()
  const { toast } = useUi()
  const [busy, setBusy] = useState(false)

  return (
    <button
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        const res = await fetch("/api/demo", { method: "POST" })
        const body = await res.json()
        setBusy(false)
        if (!res.ok) {
          toast(body.error ?? "Couldn't create sample data", { tone: "error" })
          return
        }
        toast("Sample instrument added. Only the tare test is left on this report.", { tone: "success" })
        router.push(`/reports/${body.reportId}`)
        router.refresh()
      }}
    >
      {busy ? "Creating…" : children}
    </button>
  )
}
