import { InstrumentForm } from "@/components/InstrumentForm";
import { PageHeader } from "@/components/ui";

export default function NewInstrumentPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        crumbs={[{ href: "/instruments", label: "Instruments" }]}
        title="Add instrument"
        subtitle="Values from the instrument's data plate and type approval certificate."
      />
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <InstrumentForm />
      </div>
    </div>
  );
}
