// utils/sampleTransactions.ts
//
// Generates plausible input values for the model's actual features
// (Time, V1-V28, Amount). These are NOT real transactions pulled from the
// dataset (the frontend has no direct access to the training data) --
// they're statistically reasonable stand-ins so a user can demo the
// pipeline without needing to hand-type 30 numbers. Always labeled in the
// UI as illustrative/generated, never as "real data".

export interface SampleTransaction {
  label: string;
  Time: number;
  V: number[];
  Amount: number;
}

function randomNormal(mean = 0, stdDev = 1): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

export function generateTypicalTransaction(): SampleTransaction {
  return {
    label: "Typical (generated)",
    Time: Math.floor(Math.random() * 172800),
    V: Array.from({ length: 28 }, () => Number(randomNormal(0, 1).toFixed(3))),
    Amount: Number((Math.random() * 150 + 5).toFixed(2)),
  };
}

export function generateSuspiciousTransaction(): SampleTransaction {
  // Skews a few key features further from zero and uses an unusual amount
  // pattern -- loosely mimicking documented fraud signal shapes, not a
  // real fraud case.
  const v = Array.from({ length: 28 }, () => Number(randomNormal(0, 1).toFixed(3)));
  v[13] = Number(randomNormal(-6, 1.5).toFixed(3)); // V14 often strongly negative in fraud
  v[9] = Number(randomNormal(-4, 1.5).toFixed(3));  // V10
  v[11] = Number(randomNormal(-4, 1.5).toFixed(3)); // V12
  return {
    label: "Suspicious pattern (generated)",
    Time: Math.floor(Math.random() * 172800),
    V: v,
    Amount: Number((Math.random() < 0.5 ? Math.random() * 2 : Math.random() * 500 + 200).toFixed(2)),
  };
}

export function generateRandomTransaction(): SampleTransaction {
  return {
    label: "Fully random",
    Time: Math.floor(Math.random() * 172800),
    V: Array.from({ length: 28 }, () => Number((Math.random() * 20 - 10).toFixed(3))),
    Amount: Number((Math.random() * 2000).toFixed(2)),
  };
}
