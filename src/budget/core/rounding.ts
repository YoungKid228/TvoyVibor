/**
 * Округление, совместимое с Python.
 *
 * Python использует округление половины к чётному: `round(14.25, 1)` → 14.2,
 * а JavaScript `Math.round(142.5)` → 143 → 14.3. Разница в 0.1 незаметна
 * в интерфейсе, но ломает сверку с эталоном `scripts/balance_sim.py`.
 */
export function pythonRound(value: number, digits = 0): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** digits;
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;
  let result: number;
  if (diff > 0.5) {
    result = floor + 1;
  } else if (diff < 0.5) {
    result = floor;
  } else {
    // Ровно половина — к чётному, как в Python.
    result = floor % 2 === 0 ? floor : floor + 1;
  }
  return result / factor;
}
