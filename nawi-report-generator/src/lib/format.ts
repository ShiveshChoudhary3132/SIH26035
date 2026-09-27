// All dates in the app are shown in IST, dd/mm/yyyy, regardless of where the
// server or browser happens to be running.
const TZ = "Asia/Kolkata";

export function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d));
}

export function formatDateTime(d: Date | string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(d));
  return `${parts.replace(",", "")} IST`;
}

export function formatNum(n: number, decimals: number) {
  return n.toFixed(decimals);
}

export function signed(n: number, decimals: number) {
  const s = n.toFixed(decimals);
  return n > 0 ? `+${s}` : s;
}

// Short human id used on printed reports and the verification page
export function reportNo(id: string, createdAt: Date | string) {
  const y = new Date(createdAt).getFullYear();
  return `NAWI/${y}/${id.slice(0, 6).toUpperCase()}`;
}
