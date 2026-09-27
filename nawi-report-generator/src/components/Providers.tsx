"use client"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

// Small toast + confirm dialog, replacing window.alert / window.confirm.

type Toast = {
  id: number;
  message: string;
  tone: "info" | "error" | "success";
  action?: { label: string; onClick: () => void };
};

type ConfirmOptions = {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
};

type Ctx = {
  toast: (message: string, opts?: { tone?: Toast["tone"]; action?: Toast["action"] }) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const UiContext = createContext<Ctx | null>(null);

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi must be used inside <Providers>");
  return ctx;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback<Ctx["toast"]>((message, opts) => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-2), { id, message, tone: opts?.tone ?? "info", action: opts?.action }]);
    setTimeout(() => dismiss(id), opts?.action ? 6000 : 4000);
  }, [dismiss]);

  const confirm = useCallback<Ctx["confirm"]>(
    (opts) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })),
    []
  );

  const close = (value: boolean) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  return (
    <UiContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 print:hidden">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={clsx(
              "pointer-events-auto flex items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-md",
              t.tone === "error" && "border-red-200 bg-red-50 text-red-800",
              t.tone === "success" && "border-green-200 bg-green-50 text-green-800",
              t.tone === "info" && "border-slate-200 bg-white text-slate-800"
            )}
          >
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                className="font-semibold text-navy-700 underline underline-offset-2"
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {dialog && <ConfirmDialog {...dialog} onClose={close} />}
    </UiContext.Provider>
  );
}

function ConfirmDialog({ title, body, confirmLabel = "Confirm", danger, onClose }: ConfirmOptions & { onClose: (v: boolean) => void }) {
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ok.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 print:hidden" onClick={() => onClose(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-base font-semibold text-slate-900">{title}</h2>
        {body && <p className="mt-2 text-sm text-slate-600">{body}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => onClose(false)}>Cancel</button>
          <button ref={ok} className={danger ? "btn-danger" : "btn-primary"} onClick={() => onClose(true)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
