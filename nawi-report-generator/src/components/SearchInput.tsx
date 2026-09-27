"use client"
import { useEffect, useRef, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search, X } from "lucide-react"

// Filters the server-rendered list by updating ?q= in the URL (debounced),
// so a filtered view can be bookmarked or shared.
export function SearchInput({ initial, placeholder }: { initial: string; placeholder: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [value, setValue] = useState(initial)
  const [pending, startTransition] = useTransition()
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const t = setTimeout(() => {
      const q = value.trim()
      startTransition(() => router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname, { scroll: false }))
    }, 250)
    return () => clearTimeout(t)
  }, [value, pathname, router])

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button onClick={() => setValue("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Clear search">
          <X className="h-4 w-4" />
        </button>
      )}
      {pending && <span className="absolute -bottom-5 left-0 text-[11px] text-slate-400">Searching…</span>}
    </div>
  )
}
