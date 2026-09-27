import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Providers } from "@/components/Providers";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "NAWI TestGen",
  description: "Test reports for non-automatic weighing instruments as per OIML R 76",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          <div className="flex h-screen flex-col overflow-hidden bg-slate-50 lg:flex-row print:block print:h-auto print:overflow-visible print:bg-white">
            <Sidebar />
            <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-8 print:overflow-visible print:p-0">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
