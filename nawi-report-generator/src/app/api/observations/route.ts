import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const obs = await prisma.testObservation.findUnique({ where: { id }, include: { report: true } });
  if (!obs) return NextResponse.json({ error: "Reading not found" }, { status: 404 });
  if (obs.report.status === "Completed") {
    return NextResponse.json({ error: "Readings on a closed report can't be changed" }, { status: 409 });
  }

  try {
    await prisma.testObservation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Couldn't delete the reading" }, { status: 500 });
  }
}
