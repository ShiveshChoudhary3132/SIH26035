import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { reportSchema, fieldErrors } from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the highlighted fields", fields: fieldErrors(parsed.error) }, { status: 400 });
  }

  try {
    const report = await prisma.testReport.create({ data: parsed.data });
    return NextResponse.json(report);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Couldn't start the report" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

  try {
    await prisma.testReport.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Couldn't delete the report" }, { status: 500 });
  }
}
