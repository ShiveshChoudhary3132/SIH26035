import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { instrumentSchema, fieldErrors } from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = instrumentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the highlighted fields", fields: fieldErrors(parsed.error) }, { status: 400 });
  }

  try {
    const instrument = await prisma.instrument.create({ data: parsed.data });
    return NextResponse.json(instrument);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Couldn't save the instrument" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

  try {
    // reports and observations go with it (onDelete: Cascade)
    await prisma.instrument.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Couldn't delete the instrument" }, { status: 500 });
  }
}
