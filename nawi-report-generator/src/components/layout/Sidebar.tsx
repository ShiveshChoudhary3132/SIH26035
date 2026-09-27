"use client"
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Scale, FileText, Settings, Menu, X } from "lucide-react";
import clsx from "clsx";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Instruments", href: "/instruments", icon: Scale },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded bg-saffron-500 text-white">
        <Scale className="h-[18px] w-[18px]" strokeWidth={2.25} />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold text-white">NAWI TestGen</span>
        <span className="block text-[11px] text-navy-200">OIML R 76 test reports</span>
      </span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex-1 space-y-0.5 px-3 py-4">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.name}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            onClick={() => setOpen(false)}
            className={clsx(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-navy-700 text-white" : "text-navy-100 hover:bg-navy-800 hover:text-white"
            )}
          >
            <item.icon className={clsx("h-[18px] w-[18px]", isActive ? "text-saffron-500" : "text-navy-300")} />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-navy-800 px-5 py-4 text-xs text-navy-300">
      <p className="font-medium text-navy-100">Team _NEXUS</p>
      <p>SIH 2026 · PS SIH26035</p>
    </div>
  );

  return (
    <>
      {/* phones and tablets: top bar + drawer */}
      <div className="flex h-14 shrink-0 items-center justify-between bg-navy-900 px-4 lg:hidden print:hidden">
        <Brand />
        <button onClick={() => setOpen(true)} className="rounded p-2 text-navy-100 hover:bg-navy-800" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-navy-900">
            <div className="flex h-14 items-center justify-between px-4">
              <Brand />
              <button onClick={() => setOpen(false)} className="rounded p-2 text-navy-100 hover:bg-navy-800" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      {/* desktop */}
      <aside className="hidden w-60 shrink-0 flex-col bg-navy-900 lg:flex print:hidden">
        <div className="flex h-16 items-center px-5">
          <Brand />
        </div>
        {nav}
        {footer}
      </aside>
    </>
  );
}
