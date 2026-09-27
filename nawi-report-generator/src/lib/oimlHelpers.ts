// MPE on initial verification, OIML R 76-1 (2006) Table 6.
// Loads are expressed in verification scale intervals: m = load / e.
// Each entry is the upper bound of the band (in e) where the mpe steps up.
const MPE_BANDS: Record<string, [number, number]> = {
  I: [50000, 200000],
  II: [5000, 20000],
  III: [500, 2000],
  IIII: [50, 200],
};

export const ACCURACY_CLASSES = ["I", "II", "III", "IIII"] as const;
export type AccuracyClass = (typeof ACCURACY_CLASSES)[number];

export type TestType = "Repeatability" | "Eccentricity" | "WeighingPerformance" | "Tare";

export const TEST_TYPES: TestType[] = ["WeighingPerformance", "Eccentricity", "Repeatability", "Tare"];

export const TEST_LABELS: Record<TestType, string> = {
  WeighingPerformance: "Weighing performance",
  Eccentricity: "Eccentricity",
  Repeatability: "Repeatability",
  Tare: "Tare",
};

// Clause numbers as they appear in the R 76-2 test report format
export const TEST_CLAUSES: Record<TestType, string> = {
  WeighingPerformance: "A.4.4",
  Eccentricity: "A.4.7",
  Repeatability: "A.4.10",
  Tare: "A.4.6.1",
};

export function mpeBands(accuracyClass: string): [number, number] {
  return MPE_BANDS[accuracyClass] ?? MPE_BANDS.III;
}

export function calculateMPE(load: number, e: number, accuracyClass: string): number {
  const m = Math.abs(load) / e;
  const [first, second] = mpeBands(accuracyClass);
  if (m <= first) return 0.5 * e;
  if (m <= second) return 1.0 * e;
  return 1.5 * e;
}

// Round to the nearest multiple of e, avoiding float noise like 0.30000000004
export function roundToE(value: number, e: number): number {
  const decimals = Math.max(0, -Math.floor(Math.log10(e)) + 1);
  return Number((Math.round(value / e) * e).toFixed(decimals));
}

// Number of decimals worth showing for this instrument (one below e)
export function decimalsFor(e: number): number {
  return Math.min(6, Math.max(0, -Math.floor(Math.log10(e)) + 1));
}

type InstrumentLike = {
  accuracyClass: string;
  scaleIntervalE: number;
  minCapacity: number;
  maxCapacity: number;
};

// A.4.4.1: at least 10 different loads, including Min, Max and the loads
// at (or near) which the mpe changes. We propose the mandatory points and let
// the tester add more freely.
export function weighingLoadPlan(inst: InstrumentLike): number[] {
  const { scaleIntervalE: e, minCapacity: min, maxCapacity: max } = inst;
  const [first, second] = mpeBands(inst.accuracyClass);
  const points = [min, first * e, second * e, max * 0.5, max]
    .filter((l) => l >= min && l <= max)
    .map((l) => roundToE(l, e));
  return [...new Set(points)].sort((a, b) => a - b);
}

// A.4.7: one third of Max, placed on the centre and each quarter of the receptor
export const ECCENTRICITY_POSITIONS = ["Centre", "Front left", "Front right", "Back left", "Back right"] as const;

export function eccentricityLoad(inst: InstrumentLike): number {
  return roundToE(inst.maxCapacity / 3, inst.scaleIntervalE);
}

// A.4.10: two series, one at about 50 % and one close to Max.
// 10 weighings each when Max < 1000 kg, otherwise at least 5.
export function repeatabilityPlan(inst: InstrumentLike) {
  const e = inst.scaleIntervalE;
  const count = inst.maxCapacity < 1000 ? 10 : 5;
  return [
    { load: roundToE(inst.maxCapacity * 0.5, e), count },
    { load: roundToE(inst.maxCapacity, e), count },
  ];
}

// Repeatability passes when the spread of indications at one load
// stays within the absolute mpe for that load.
export function repeatabilitySpread(indications: number[]) {
  if (indications.length < 2) return 0;
  return Math.max(...indications) - Math.min(...indications);
}

type Obs = { testType: string; load: number; indication: number; result: string; position?: string | null };

export type TestStatus = { done: number; required: number; failed: number; complete: boolean };

export function testStatus(testType: TestType, observations: Obs[], inst: InstrumentLike): TestStatus {
  const obs = observations.filter((o) => o.testType === testType);
  const failed = obs.filter((o) => o.result === "Fail").length;
  const e = inst.scaleIntervalE;
  const same = (a: number, b: number) => Math.abs(a - b) < e / 2;

  if (testType === "WeighingPerformance") {
    const plan = weighingLoadPlan(inst);
    const done = plan.filter((l) => obs.some((o) => same(o.load, l))).length;
    return { done, required: plan.length, failed, complete: done === plan.length };
  }
  if (testType === "Eccentricity") {
    const done = ECCENTRICITY_POSITIONS.filter((p) => obs.some((o) => o.position === p)).length;
    return { done, required: ECCENTRICITY_POSITIONS.length, failed, complete: done === ECCENTRICITY_POSITIONS.length };
  }
  if (testType === "Repeatability") {
    const plan = repeatabilityPlan(inst);
    const required = plan.reduce((s, p) => s + p.count, 0);
    let done = 0;
    let spreadFailed = 0;
    for (const p of plan) {
      const series = obs.filter((o) => same(o.load, p.load));
      done += Math.min(series.length, p.count);
      if (repeatabilitySpread(series.map((o) => o.indication)) > calculateMPE(p.load, e, inst.accuracyClass)) spreadFailed++;
    }
    return { done, required, failed: failed + spreadFailed, complete: done >= required };
  }
  // Tare: at least one weighing with a tare applied
  return { done: Math.min(obs.length, 1), required: 1, failed, complete: obs.length > 0 };
}
