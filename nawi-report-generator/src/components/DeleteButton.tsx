"use client"
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUi } from "./Providers";

export function DeleteButton({
  id,
  type,
  label,
  redirectTo,
}: {
  id: string;
  type: "instrument" | "report";
  label?: string; // what the dialog calls it, e.g. "BS-30 (SN 1234)"
  redirectTo?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { confirm, toast } = useUi();

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Delete this ${type}?`,
      body:
        type === "instrument"
          ? `${label ?? "The instrument"} and all of its test reports will be removed. This can't be undone.`
          : `${label ?? "The report"} and all its readings will be removed. This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    startTransition(async () => {
      const res = await fetch(`/api/${type}s?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast(`Couldn't delete the ${type}`, { tone: "error" });
        return;
      }
      toast(`${type === "instrument" ? "Instrument" : "Report"} deleted`);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    });
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      title={`Delete ${type}`}
      aria-label={`Delete ${type}`}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
