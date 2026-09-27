import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { observationSchema, fieldErrors } from "@/lib/schemas";
import { calculateMPE } from "@/lib/oimlHelpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = observationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reading", fields: fieldErrors(parsed.error) }, { status: 400 });
  }

  const report = await prisma.testReport.findUnique({ where: { id }, include: { instrument: true } });
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  if (report.status === "Completed") {
    return NextResponse.json({ error: "This report is already closed" }, { status: 409 });
  }

  // Error and mpe are worked out here, not taken from the browser, so a
  // saved reading always matches the instrument's class and e.
  const { load, indication, testType, position, tareValue } = parsed.data;
  const { scaleIntervalE: e, accuracyClass } = report.instrument;
  const error = indication - load;
  const mpe = calculateMPE(load, e, accuracyClass);
  // compare with a small tolerance so 0.1 - 0.3 style float noise doesn't flip a result
  const result = Math.abs(error) <= mpe + e * 1e-9 ? "Pass" : "Fail";

  try {
    const observation = await prisma.testObservation.create({
      data: {
        reportId: id,
        testType,
        load,
        indication,
        error,
        mpe,
        result,
        position: position ?? null,
        tareValue: tareValue ?? null,
      },
    });
    return NextResponse.json(observation);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Couldn't save the reading" }, { status: 500 });
  }
}
