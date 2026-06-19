import type { ReactNode } from "react";

interface PowerMeterFlowDiagramProps {
  solarMw: number | null;
  auxMw: number | null;
  exportMw: number | null;
}

function formatMw(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return value.toFixed(2);
}

/** Hub-and-spoke paths in 0–100 coordinate space (continuous, no gaps). */
const FLOW_PATHS = {
  solarToHub: "M 50 17 L 50 44",
  hubToAux: "M 50 50 C 38 58, 26 66, 18 78",
  hubToGrid: "M 50 50 C 62 58, 74 66, 82 78",
} as const;

const HUB = { cx: 50, cy: 47 };

function SolarIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden>
      <rect
        x="8"
        y="24"
        width="48"
        height="28"
        rx="2"
        className="fill-neutral-100 stroke-brand-500 dark:fill-neutral-900 dark:stroke-brand-400"
        strokeWidth="1.5"
      />
      <path
        d="M8 34h48M20 24V52M32 24V52M44 24V52"
        className="stroke-neutral-300 dark:stroke-neutral-700"
        strokeWidth="1"
      />
      <circle cx="32" cy="14" r="7" className="fill-brand-500" opacity="0.9" />
      <path
        d="M32 3v4M32 21v4M41 14h4M19 14h4M38.5 7.5l2.8 2.8M22.7 22.7l2.8 2.8M38.5 20.5l2.8-2.8M22.7 5.3l2.8 2.8"
        className="stroke-amber-500"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AuxIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden>
      <rect
        x="12"
        y="16"
        width="40"
        height="36"
        rx="3"
        className="fill-neutral-100 stroke-brand-500 dark:fill-neutral-900 dark:stroke-brand-400"
        strokeWidth="1.5"
      />
      <rect x="18" y="22" width="28" height="8" rx="1" className="fill-neutral-200 dark:fill-neutral-800" />
      <rect x="18" y="34" width="12" height="12" rx="1" className="fill-neutral-300 dark:fill-neutral-700" />
      <rect x="34" y="34" width="12" height="12" rx="1" className="fill-neutral-300 dark:fill-neutral-700" />
      <path
        d="M32 8v8"
        className="stroke-neutral-400 dark:stroke-neutral-600"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="32" cy="6" r="2" className="fill-brand-500" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden>
      <path
        d="M32 8 20 56h24L32 8Z"
        className="fill-neutral-100 stroke-brand-500 dark:fill-neutral-900 dark:stroke-brand-400"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M26 40h12M24 48h16M22 32h20"
        className="stroke-neutral-300 dark:stroke-neutral-700"
        strokeWidth="1.2"
      />
      <path
        d="M18 20h28M14 28h36"
        className="stroke-brand-500"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="8" r="2" className="fill-amber-500" />
    </svg>
  );
}

function NodeCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center rounded-sm border border-neutral-200/60 bg-white/90 px-2 py-1.5 text-center shadow-sm dark:border-neutral-800/60 dark:bg-neutral-950/95">
      <div className="mb-0.5 flex h-9 w-9 items-center justify-center">{icon}</div>
      <p className="text-[10px] font-medium leading-tight text-neutral-700 dark:text-neutral-300">
        {title}
      </p>
      <p className="mt-0.5 text-xs font-semibold tabular-nums leading-none text-emerald-600 dark:text-emerald-400">
        {value}{" "}
        <span className="text-[9px] font-normal text-neutral-500 dark:text-neutral-500">MW</span>
      </p>
      <p className="mt-0.5 text-[9px] leading-tight text-neutral-500 dark:text-neutral-500">
        {subtitle}
      </p>
    </div>
  );
}

function FlowTrack({
  d,
  active,
  gradientId,
  delay = "0s",
}: {
  d: string;
  active: boolean;
  gradientId: string;
  delay?: string;
}) {
  return (
    <g>
      <path
        d={d}
        fill="none"
        className="stroke-neutral-300 dark:stroke-neutral-800"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {active ? (
        <path
          d={d}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          strokeDasharray="0.12 0.88"
          className="power-flow-pulse"
          style={{ animationDelay: delay }}
        />
      ) : null}
    </g>
  );
}

export function PowerMeterFlowDiagram({
  solarMw,
  auxMw,
  exportMw,
}: PowerMeterFlowDiagramProps) {
  const hasSolarFlow = (solarMw ?? 0) > 0;
  const hasAuxFlow = (auxMw ?? 0) > 0;
  const hasExportFlow = (exportMw ?? 0) > 0;
  const hasAnyFlow = hasSolarFlow || hasAuxFlow || hasExportFlow;

  return (
    <div className="relative mx-auto w-full max-w-[22rem]">
      <style>{`
        @keyframes power-flow-pulse {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }
        .power-flow-pulse {
          animation: power-flow-pulse 1.8s linear infinite;
        }
      `}</style>

      <svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="power-flow-solar" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
            <stop offset="45%" stopColor="#22c55e" stopOpacity="1" />
            <stop offset="100%" stopColor="#4ade80" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="power-flow-aux" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="power-flow-grid" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fb923c" stopOpacity="1" />
          </linearGradient>
          <filter id="power-hub-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <FlowTrack
          d={FLOW_PATHS.solarToHub}
          active={hasSolarFlow}
          gradientId="power-flow-solar"
        />
        <FlowTrack
          d={FLOW_PATHS.hubToAux}
          active={hasAuxFlow || hasSolarFlow}
          gradientId="power-flow-aux"
          delay="0.3s"
        />
        <FlowTrack
          d={FLOW_PATHS.hubToGrid}
          active={hasExportFlow || hasSolarFlow}
          gradientId="power-flow-grid"
          delay="0.55s"
        />

        <circle
          cx={HUB.cx}
          cy={HUB.cy}
          r="3.2"
          className="fill-neutral-200 stroke-brand-500 dark:fill-neutral-900 dark:stroke-brand-400"
          strokeWidth="1.2"
          filter={hasAnyFlow ? "url(#power-hub-glow)" : undefined}
        />
        {hasAnyFlow ? (
          <circle
            cx={HUB.cx}
            cy={HUB.cy}
            r="1.4"
            className="fill-brand-500"
          />
        ) : null}
      </svg>

      <div className="relative grid min-h-[11.5rem] grid-rows-[auto_1fr_auto] gap-0 py-1">
        <div className="flex justify-center">
          <NodeCard
            icon={<SolarIcon />}
            title="Solar Panels"
            value={formatMw(solarMw)}
            subtitle="Live Solar Generation"
          />
        </div>

        <div aria-hidden className="min-h-[2.5rem]" />

        <div className="grid grid-cols-2 gap-3 px-0.5">
          <NodeCard
            icon={<AuxIcon />}
            title="Aux Box"
            value={formatMw(auxMw)}
            subtitle="Live Aux. Consumption"
          />
          <NodeCard
            icon={<GridIcon />}
            title="Grid Export"
            value={formatMw(exportMw)}
            subtitle="Live Total Export"
          />
        </div>
      </div>
    </div>
  );
}
