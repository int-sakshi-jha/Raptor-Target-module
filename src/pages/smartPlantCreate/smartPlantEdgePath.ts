/** Build an SVG path through points using horizontal-first orthogonal (Manhattan) segments. */

export type PathPoint = { x: number; y: number };

/** Straight polyline (no forced right angles) — for dashed/solid/smooth when editing with bends. */
export function buildPolylinePathString(points: PathPoint[]): {
  path: string;
  labelX: number;
  labelY: number;
} {
  if (points.length < 2) {
    return { path: "", labelX: points[0]?.x ?? 0, labelY: points[0]?.y ?? 0 };
  }
  const cleaned: PathPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!cleaned.length) {
      cleaned.push(p);
      continue;
    }
    const prev = cleaned[cleaned.length - 1];
    if (Math.hypot(p.x - prev.x, p.y - prev.y) > 0.5) cleaned.push(p);
  }
  if (cleaned.length < 2) {
    const p = cleaned[0] ?? points[0];
    return { path: "", labelX: p.x, labelY: p.y };
  }
  let path = `M ${cleaned[0].x} ${cleaned[0].y}`;
  for (let i = 1; i < cleaned.length; i++) {
    path += ` L ${cleaned[i].x} ${cleaned[i].y}`;
  }
  const mid = Math.floor((cleaned.length - 1) / 2);
  const a = cleaned[mid];
  const b = cleaned[mid + 1];
  return {
    path,
    labelX: (a.x + b.x) / 2,
    labelY: (a.y + b.y) / 2,
  };
}

export function buildOrthogonalPathString(points: PathPoint[]): {
  path: string;
  labelX: number;
  labelY: number;
} {
  if (points.length < 2) {
    return { path: "", labelX: points[0]?.x ?? 0, labelY: points[0]?.y ?? 0 };
  }
  const cleaned: PathPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!cleaned.length) {
      cleaned.push(p);
      continue;
    }
    const prev = cleaned[cleaned.length - 1];
    if (Math.hypot(p.x - prev.x, p.y - prev.y) > 0.5) cleaned.push(p);
  }
  if (cleaned.length < 2) {
    const p = cleaned[0] ?? points[0];
    return { path: "", labelX: p.x, labelY: p.y };
  }
  let path = `M ${cleaned[0].x} ${cleaned[0].y}`;
  for (let i = 0; i < cleaned.length - 1; i++) {
    const a = cleaned[i];
    const b = cleaned[i + 1];
    if (Math.abs(a.x - b.x) < 0.5) {
      path += ` L ${b.x} ${b.y}`;
    } else if (Math.abs(a.y - b.y) < 0.5) {
      path += ` L ${b.x} ${b.y}`;
    } else {
      path += ` L ${b.x} ${a.y} L ${b.x} ${b.y}`;
    }
  }
  const mid = cleaned[Math.floor(cleaned.length / 2)];
  return { path, labelX: mid.x, labelY: mid.y };
}

const MIN_SEGMENT_HANDLE_PX = 10;

/** One Manhattan hop (horizontal-first) between two points as 1–2 straight segments. */
export function expandOneOrthogonalHop(
  a: PathPoint,
  b: PathPoint,
): { from: PathPoint; to: PathPoint }[] {
  if (Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5) return [];
  if (Math.abs(a.x - b.x) < 0.5 || Math.abs(a.y - b.y) < 0.5) {
    return [{ from: a, to: b }];
  }
  const c: PathPoint = { x: b.x, y: a.y };
  return [
    { from: a, to: c },
    { from: c, to: b },
  ];
}

export type OrthoSegmentMidpoint = {
  x: number;
  y: number;
  /** Control edge index: segment between control[edgeIndex] and control[edgeIndex + 1]. */
  edgeIndex: number;
  /** 0 = first leg when a corner exists, else 0 only. */
  leg: number;
  from: PathPoint;
  to: PathPoint;
};

/** Midpoints of each straight run (for segment drag handles). */
/** Midpoints on each straight segment of a polyline (for drag-to-bend handles). */
export function polylineSegmentMidpoints(control: PathPoint[]): OrthoSegmentMidpoint[] {
  if (control.length < 2) return [];
  const out: OrthoSegmentMidpoint[] = [];
  for (let edgeIndex = 0; edgeIndex < control.length - 1; edgeIndex++) {
    const from = control[edgeIndex];
    const to = control[edgeIndex + 1];
    const len = Math.hypot(to.x - from.x, to.y - from.y);
    if (len < MIN_SEGMENT_HANDLE_PX) continue;
    out.push({
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2,
      edgeIndex,
      leg: 0,
      from,
      to,
    });
  }
  return out;
}

export function orthogonalSegmentMidpoints(control: PathPoint[]): OrthoSegmentMidpoint[] {
  if (control.length < 2) return [];
  const out: OrthoSegmentMidpoint[] = [];
  for (let edgeIndex = 0; edgeIndex < control.length - 1; edgeIndex++) {
    const hops = expandOneOrthogonalHop(control[edgeIndex], control[edgeIndex + 1]);
    hops.forEach((hop, leg) => {
      const len = Math.hypot(hop.to.x - hop.from.x, hop.to.y - hop.from.y);
      if (len < MIN_SEGMENT_HANDLE_PX) return;
      out.push({
        x: (hop.from.x + hop.to.x) / 2,
        y: (hop.from.y + hop.to.y) / 2,
        edgeIndex,
        leg,
        from: hop.from,
        to: hop.to,
      });
    });
  }
  return out;
}

/** Single midpoint handle on the straight chord between anchors (default dashed/solid/smooth/step before custom routing). */
/** Insert a bend at the midpoint of the longest segment (chord or polyline). */
export function insertMidpointOnLongestSegment(
  source: PathPoint,
  waypoints: PathPoint[],
  target: PathPoint,
): PathPoint[] {
  const full: PathPoint[] = [source, ...waypoints, target];
  if (full.length < 2) return waypoints;
  let bestI = 0;
  let bestLen = 0;
  for (let i = 0; i < full.length - 1; i++) {
    const len = Math.hypot(full[i + 1].x - full[i].x, full[i + 1].y - full[i].y);
    if (len > bestLen) {
      bestLen = len;
      bestI = i;
    }
  }
  const mid: PathPoint = {
    x: (full[bestI].x + full[bestI + 1].x) / 2,
    y: (full[bestI].y + full[bestI + 1].y) / 2,
  };
  const nextFull = [...full.slice(0, bestI + 1), mid, ...full.slice(bestI + 1)];
  return nextFull.slice(1, -1);
}

export function straightChordMidpointHandle(from: PathPoint, to: PathPoint): OrthoSegmentMidpoint | null {
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  if (len < MIN_SEGMENT_HANDLE_PX) return null;
  return {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
    edgeIndex: 0,
    leg: 0,
    from,
    to,
  };
}

/** Distance from p to segment ab (infinite line clamped to segment). */
export function distancePointToSegment(p: PathPoint, a: PathPoint, b: PathPoint): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const ab2 = abx * abx + aby * aby;
  if (ab2 < 1e-6) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  const qx = a.x + t * abx;
  const qy = a.y + t * aby;
  return Math.hypot(p.x - qx, p.y - qy);
}
