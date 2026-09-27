"use client"
import { Printer } from "lucide-react"

export function PrintButton({ className = "btn-primary" }: { className?: string }) {
  return (
    <button onClick={() => window.print()} className={className}>
      <Printer className="h-4 w-4" />
      Print / save as PDF
    </button>
  )
}
