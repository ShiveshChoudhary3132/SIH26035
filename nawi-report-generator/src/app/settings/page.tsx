import { stat } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { Clock, Shield, Database, Server, Download } from "lucide-react";
import prisma from "@/lib/prisma";
import { DemoButton } from "@/components/DemoButton";
import { PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import pkg from "../../../package.json";

export default async function SettingsPage() {
  await connection();

  const dbFile = path.join(process.cwd(), "prisma", "dev.db");
  const [dbSize, counts] = await Promise.all([
    stat(dbFile).then((s) => s.size).catch(() => null),
    Promise.all([prisma.instrument.count(), prisma.testReport.count(), prisma.testObservation.count()]),
  ]);
  const [instruments, reports, readings] = counts;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" subtitle="System status, compliance references and data." />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Panel icon={<Clock className="h-4 w-4" />} title="Time">
          <p className="text-sm text-slate-600">
            Readings and report closures are timestamped on the server and shown in IST.
          </p>
          <p className="mt-3 font-mono text-sm text-slate-900">{formatDateTime(new Date())}</p>
          <p className="mt-3 text-xs text-slate-500">
            This is the host machine&apos;s clock. For traceability to UTC(NPLI), sync the host with time.nplindia.org.
          </p>
        </Panel>

        <Panel icon={<Shield className="h-4 w-4" />} title="Compliance references">
          <ul className="space-y-1.5 text-sm text-slate-700">
            <li><strong>OIML R 76-1</strong> (2006): requirements and test procedures</li>
            <li><strong>OIML R 76-2</strong> (2007): test report format</li>
            <li><strong>IS 9281:2023</strong>: electronic weighing systems</li>
            <li><strong>Legal Metrology (General) Rules, 2011</strong>, incl. 4th Amendment 2026</li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">mpe values use the initial-verification table (R 76-1, Table 6).</p>
        </Panel>

        <Panel icon={<Database className="h-4 w-4" />} title="Data">
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div><dt className="text-xs text-slate-500">Instruments</dt><dd className="font-medium tabular">{instruments}</dd></div>
            <div><dt className="text-xs text-slate-500">Reports</dt><dd className="font-medium tabular">{reports}</dd></div>
            <div><dt className="text-xs text-slate-500">Readings</dt><dd className="font-medium tabular">{readings}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            SQLite, stored locally{dbSize !== null && ` (${(dbSize / 1024).toFixed(0)} KB)`}. Nothing leaves this machine.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="/api/backup" className="btn-secondary" download>
              <Download className="h-4 w-4" /> Download backup
            </a>
            <DemoButton>Add sample data</DemoButton>
          </div>
        </Panel>

        <Panel icon={<Server className="h-4 w-4" />} title="System">
          <dl className="space-y-1.5 text-sm">
            <Row k="Version" v={pkg.version} />
            <Row k="Mode" v={process.env.NODE_ENV === "production" ? "Production" : "Development"} />
            <Row k="Node.js" v={process.version} />
            <Row k="Next.js" v={pkg.dependencies.next} />
          </dl>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="text-navy-500">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{k}</dt>
      <dd className="font-mono text-slate-900">{v}</dd>
    </div>
  );
}
