import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  calculateMPE,
  weighingLoadPlan,
  eccentricityLoad,
  repeatabilityPlan,
  ECCENTRICITY_POSITIONS,
} from "@/lib/oimlHelpers";

// Seeds a sample Class III bench scale with one finished report and one
// in-progress report (only the tare test left), so the whole flow can be
// seen in under a minute.
export async function POST() {
  const spec = {
    manufacturer: "Sample Scales Pvt. Ltd.",
    model: "BS-30 (demo)",
    serialNumber: `DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
    accuracyClass: "III",
    capacity: 30,
    maxCapacity: 30,
    minCapacity: 0.1,
    scaleIntervalE: 0.005,
    scaleIntervalD: 0.005,
  };

  // Indications are whole multiples of d with small, believable errors
  const e = spec.scaleIntervalE;
  const reading = (load: number, offsetInE: number) => {
    const indication = Number((load + offsetInE * e).toFixed(3));
    const error = indication - load;
    const mpe = calculateMPE(load, e, spec.accuracyClass);
    return { load, indication, error, mpe, result: Math.abs(error) <= mpe + 1e-12 ? "Pass" : "Fail" };
  };

  const build = () => {
    const rows: Array<ReturnType<typeof reading> & { testType: string; position?: string }> = [];
    for (const load of weighingLoadPlan(spec)) {
      rows.push({ testType: "WeighingPerformance", ...reading(load, load >= 10 ? 1 : 0) });
    }
    const ecc = eccentricityLoad(spec);
    ECCENTRICITY_POSITIONS.forEach((position, i) => {
      rows.push({ testType: "Eccentricity", position, ...reading(ecc, i === 3 ? -1 : 0) });
    });
    for (const { load, count } of repeatabilityPlan(spec)) {
      for (let i = 0; i < count; i++) {
        rows.push({ testType: "Repeatability", ...reading(load, i % 4 === 1 ? 1 : 0) });
      }
    }
    return rows;
  };

  try {
    const instrument = await prisma.instrument.create({ data: spec });

    const monthAgo = new Date(Date.now() - 34 * 24 * 3600 * 1000);
    await prisma.testReport.create({
      data: {
        instrumentId: instrument.id,
        testerName: "A. Sharma",
        temperature: 21.4,
        humidity: 48,
        pressure: 1009,
        temperatureEnd: 21.9,
        humidityEnd: 50,
        pressureEnd: 1009,
        zeroTracking: "InOperation",
        status: "Completed",
        result: "Pass",
        date: monthAgo,
        createdAt: monthAgo,
        completedAt: monthAgo,
        observations: {
          create: [
            ...build(),
            { testType: "Tare", tareValue: 5, ...reading(10, 0) },
          ],
        },
      },
    });

    const current = await prisma.testReport.create({
      data: {
        instrumentId: instrument.id,
        testerName: "A. Sharma",
        temperature: 22.1,
        humidity: 52,
        pressure: 1011,
        observations: { create: build() },
      },
    });

    return NextResponse.json({ instrumentId: instrument.id, reportId: current.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Couldn't create the sample data" }, { status: 500 });
  }
}
