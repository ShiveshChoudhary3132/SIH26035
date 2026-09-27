import { headers } from "next/headers"
import QRCode from "qrcode"

// Public URL of a report's verification page, built from the incoming
// request so it works on localhost, a LAN IP, or a deployed host.
export async function verifyUrl(reportId: string) {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}/verify/${reportId}`
}

export async function qrSvg(text: string) {
  return QRCode.toString(text, { type: "svg", margin: 0, errorCorrectionLevel: "M" })
}
