import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { completeSchema, fieldErrors } from "@/lib/schemas";
import { TEST_TYPES, TEST_LABELS, testStatus } from "@/lib/oimlHelpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = completeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the highlighted fields", fields: fieldErrors(parsed.error) }, { status: 400 });
  }

  const report = await prisma.testReport.findUnique({
    where: { id },
    include: { instrument: true, observations: true },
  });
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  if (report.status === "Completed") return NextResponse.json({ error: "Already closed" }, { status: 409 });

  const statuses = TEST_TYPES.map((t) => ({ t, s: testStatus(t, report.observations, report.instrument) }));
  const missing = statuses.filter(({ s }) => !s.complete).map(({ t }) => TEST_LABELS[t]);
  if (missing.length) {
    return NextResponse.json({ error: `Still to do: ${missing.join(", ")}` }, { status: 409 });
  }

  const result = statuses.some(({ s }) => s.failed > 0) ? "Fail" : "Pass";

  try {
    const updated = await prisma.testReport.update({
      where: { id },
      data: { ...parsed.data, status: "Completed", result, completedAt: new Date() },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Couldn't close the report" }, { status: 500 });
  }
}
