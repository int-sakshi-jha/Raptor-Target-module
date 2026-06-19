/** Edge `data` fields for independent endpoint stretch (flow-space px). */

export type LineStretchFields = {
  /** @deprecated symmetric stretch; use lineStretchStart / lineStretchEnd */
  lineStretch?: number;
  /** Move drawn start from source handle toward target (positive shortens from source). */
  lineStretchStart?: number;
  /** Move drawn end from target handle toward source (positive shortens from end). */
  lineStretchEnd?: number;
};

/** Resolve start/end stretch; migrates legacy symmetric `lineStretch` when new keys are absent. */
export function resolveEdgeLineStretches(
  data: Record<string, unknown> | LineStretchFields | undefined | null,
): { start: number; end: number } {
  const d = data ?? {};
  const legacy = typeof d.lineStretch === "number" ? d.lineStretch : null;
  const hasStart = typeof d.lineStretchStart === "number";
  const hasEnd = typeof d.lineStretchEnd === "number";
  if (hasStart || hasEnd) {
    return {
      start: hasStart ? (d.lineStretchStart as number) : 0,
      end: hasEnd ? (d.lineStretchEnd as number) : 0,
    };
  }
  if (legacy !== null) {
    return { start: legacy / 2, end: legacy / 2 };
  }
  return { start: 0, end: 0 };
}

export function clampEdgeStretches(
  distance: number,
  start: number,
  end: number,
): { start: number; end: number } {
  const usableDistance = Math.max(distance, 1);
  const maxShortenEach = Math.max(0, usableDistance / 2 - 8);
  const minSeg = 4;
  const maxShrinkTotal = Math.max(0, usableDistance - minSeg);

  let s = Math.max(-maxShortenEach, Math.min(2000, start));
  let e = Math.max(-maxShortenEach, Math.min(2000, end));

  if (s + e > maxShrinkTotal) {
    const sum = s + e;
    const scale = sum > 0 ? maxShrinkTotal / sum : 0;
    s *= scale;
    e *= scale;
  }

  return { start: s, end: e };
}
