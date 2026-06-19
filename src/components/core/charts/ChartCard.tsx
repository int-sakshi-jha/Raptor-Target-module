// src/components/core/charts/ChartCard.tsx
import React from "react";
import Highcharts from "highcharts";
import HighchartsExporting from "highcharts/modules/exporting";
import HighchartsExportData from "highcharts/modules/export-data";
import HighchartsOfflineExporting from "highcharts/modules/offline-exporting";
import HighchartsFullscreen from "highcharts/modules/full-screen";

// Initialize export modules once
if (typeof HighchartsExporting === "function") HighchartsExporting(Highcharts);
if (typeof HighchartsExportData === "function") HighchartsExportData(Highcharts);
if (typeof HighchartsOfflineExporting === "function") HighchartsOfflineExporting(Highcharts);
if (typeof HighchartsFullscreen === "function") HighchartsFullscreen(Highcharts);
import {
  TrendingUp,
  CircleDot,
  PieChart as PieIcon,
  BarChart3,
  LayoutGrid,
  Table2,
  AreaChart as AreaIcon,
  Radar,
  Gauge,
  Maximize2,
  Printer,
  Download,
  FileImage,
  FileText,
  Sheet,
  ChevronDown,
} from "lucide-react";
import LineChart from "./LineChart";
import AreaChart from "./AreaChart";
import RadarChart from "./RadarChart";
import GaugeChart from "./GaugeChart";
import BubblesChart from "./BubblesChart";
import PieChart from "./PieChart";
import BarChart from "./BarChart";
import { createPortal } from "react-dom";

// ── Dark-mode hook ────────────────────────────────────────────────────────────
const useDarkMode = () => {
  const [isDark, setIsDark] = React.useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  React.useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark")),
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);
  return isDark;
};

export type ChartType =
  | "line"
  | "area"
  | "radar"
  | "gauge"
  | "bubble"
  | "pie"
  | "bar";

// ── Unified data types ────────────────────────────────────────────────────────
export type ChartDataPoint = {
  color?: string;
  name: string;
  value: number;
  size?: number;
  x?: number;
};

export type ChartSeries = {
  name: string;
  data: ChartDataPoint[];
  opacity?: number;
};

const CHART_TABS: { key: ChartType; label: string; icon: React.ReactNode }[] = [
  { key: "line", label: "Line", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { key: "area", label: "Area", icon: <AreaIcon className="w-3.5 h-3.5" /> },
  { key: "radar", label: "Radar", icon: <Radar className="w-3.5 h-3.5" /> },
  {
    key: "bubble",
    label: "Bubble",
    icon: <CircleDot className="w-3.5 h-3.5" />,
  },
  { key: "pie", label: "Pie", icon: <PieIcon className="w-3.5 h-3.5" /> },
  { key: "bar", label: "Bar", icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { key: "gauge", label: "Gauge", icon: <Gauge className="w-3.5 h-3.5" /> },
];

// ── Export menu items ─────────────────────────────────────────────────────────
// Exporting module methods (print, exportChart, downloadCSV…) are added at runtime
// and are not on Highcharts.Chart's static type — cast to any to call them safely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HCExportChart = any;

type ExportItem =
  | {
      type: "action";
      label: string;
      icon: React.ReactNode;
      action: (c: HCExportChart) => void;
    }
  | { type: "separator" };

const EXPORT_ITEMS: ExportItem[] = [
  {
    type: "action",
    label: "View fullscreen",
    icon: <Maximize2 className="w-3.5 h-3.5" />,
    action: (c) => c.fullscreen.toggle(),
  },
  {
    type: "action",
    label: "Print chart",
    icon: <Printer className="w-3.5 h-3.5" />,
    action: (c) => c.print(),
  },
  { type: "separator" },
  {
    type: "action",
    label: "Download PNG",
    icon: <FileImage className="w-3.5 h-3.5" />,
    action: (c) => c.exportChart({ type: "image/png" }),
  },
  {
    type: "action",
    label: "Download JPEG",
    icon: <FileImage className="w-3.5 h-3.5" />,
    action: (c) => c.exportChart({ type: "image/jpeg" }),
  },
  {
    type: "action",
    label: "Download PDF",
    icon: <FileText className="w-3.5 h-3.5" />,
    action: (c) => c.exportChart({ type: "application/pdf" }),
  },
  {
    type: "action",
    label: "Download SVG",
    icon: <Download className="w-3.5 h-3.5" />,
    action: (c) => c.exportChart({ type: "image/svg+xml" }),
  },
  { type: "separator" },
  {
    type: "action",
    label: "Download CSV",
    icon: <Sheet className="w-3.5 h-3.5" />,
    action: (c) => c.downloadCSV(),
  },
  {
    type: "action",
    label: "Download XLS",
    icon: <Sheet className="w-3.5 h-3.5" />,
    action: (c) => c.downloadXLS(),
  },
];

export type ChartCardProps = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  chartTitles?: Partial<
    Record<ChartType, { title: string; subtitle?: string }>
  >;
  allowedChartTypes?: ChartType[];
  defaultChartType?: ChartType;
  storageKey?: string;
  tableContent?: React.ReactNode;
  defaultView?: "chart" | "table";

  categories?: string[];
  series: ChartSeries[];

  yAxisTitle?: string;
  yAxisSuffix?: string;
  tooltipSuffix?: string;
  xAxisTitle?: string;
  valueLabel?: string;
  sizeLabel?: string;

  // ── Area-chart-specific overrides ────────────────────────────────────────
  areaFillOpacity?: number;
  areaFillStyle?: "solid" | "gradient";
  areaTooltipPointFormat?: string;
  areaAccessibilityDescription?: string;
  areaAllowDecimalsX?: boolean;

  // ── Radar-chart-specific overrides ───────────────────────────────────────
  radarYMin?: number;
  radarYMax?: number;
  radarTickAmount?: number;
  radarChartStyle?: "filled" | "line";
  radarFillOpacity?: number;
  radarValueLabel?: string;

  // ── Gauge-chart-specific overrides ───────────────────────────────────────
  /** Single numeric value to display on the gauge needle. */
  gaugeValue?: number;
  /** Series name shown in the tooltip. Default: "Value" */
  gaugeName?: string;
  /** Suffix shown on the needle label and tooltip (e.g. " km/h"). */
  gaugeValueSuffix?: string;
  gaugeMin?: number;
  gaugeMax?: number;
  gaugePlotBands?: {
    from: number;
    to: number;
    color: string;
    thickness?: number;
  }[];
  gaugeArcStyle?: "half" | "full";
  gaugeHeight?: string;

  // ── Chart-specific overrides ──────────────────────────────────────────────
  bubbleXAxisMin?: number;
  bubbleXAxisMax?: number;
  bubbleYAxisMin?: number;
  bubbleYAxisMax?: number;
  bubbleZoomable?: boolean;
  bubbleMaxSize?: string;
  bubbleMinSize?: number;
  barShowDataLabels?: boolean;
  barShowLegend?: boolean;
};

// ── Pill helpers ──────────────────────────────────────────────────────────────
const PillTab: React.FC<{
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ isActive, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-1 px-2 py-1 rounded-xs text-[11px] font-medium
      transition-all duration-150
      ${
        isActive
          ? "bg-white dark:bg-neutral-600 text-primary-600 dark:text-primary-400 shadow-sm"
          : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
      }
    `}
    title={label}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);
// for Small screen
const MobileChartDropdown: React.FC<{
  activeChart: ChartType;
  visibleTabs: typeof CHART_TABS;
  onChange: (type: ChartType) => void;
}> = ({ activeChart, visibleTabs, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const [pos, setPos] = React.useState({ top: 0, right: 0 });

  const active = visibleTabs.find((t) => t.key === activeChart);

  const openMenu = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({
        top: r.bottom + window.scrollY + 6,
        right: window.innerWidth - r.right,
      });
    }
    setOpen(true);
  };

  React.useEffect(() => {
    if (!open) return;

    const close = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const onScroll = () => setOpen(false);

    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const menu = open ? (
    <div
      ref={menuRef}
      style={{
        position: "absolute",
        top: pos.top,
        right: pos.right,
        zIndex: 9999,
      }}
      className="
        min-w-[175px]
        rounded-xs border border-neutral-200 dark:border-neutral-700
        bg-white dark:bg-neutral-800
        shadow-xl shadow-black/10 dark:shadow-black/40
        py-1 overflow-hidden
      "
    >
      {visibleTabs.map((tab) => (
        <button
          key={tab.key}
          onMouseDown={(e) => {
            e.preventDefault();
            onChange(tab.key);
            setOpen(false);
          }}
          className="
            w-full flex items-center gap-2.5 px-3.5 py-2 text-xs
            text-neutral-700 dark:text-neutral-200
            hover:bg-neutral-50 dark:hover:bg-neutral-700/60
            transition-colors duration-100
          "
        >
          <span className="text-neutral-400 dark:text-neutral-500">
            {tab.icon}
          </span>
          {tab.label}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <>
      <div className="relative xl:hidden">
        <button
          ref={btnRef}
          onClick={() => (open ? setOpen(false) : openMenu())}
          className="
            glass-morphism-button
            flex items-center gap-2 px-3 py-1.5 rounded-xs text-xs font-medium
            transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2
            dark:focus:ring-offset-neutral-900
            bg-transparent border border-primary-500 dark:border-primary-400
            text-primary-500 dark:text-primary-400
            hover:bg-primary-500/10 dark:hover:bg-primary-400/20
            focus:ring-primary-300 dark:focus:ring-primary-800
          "
        >
          {active?.icon}
          <span className="hidden sm:inline">Graphs</span>
          <ChevronDown
            className={`w-3 h-3 transition-transform duration-150 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {createPortal(menu, document.body)}
    </>
  );
};

const PillGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-1 rounded-xs bg-neutral-100/80 dark:bg-neutral-700/50">
    {children}
  </div>
);

// ── Export dropdown ───────────────────────────────────────────────────────────
// Rendered via a portal into document.body so it escapes any overflow:hidden
// ancestor (including the card itself and the Highcharts SVG layer).
const ExportDropdown: React.FC<{
  getChart: () => HCExportChart | undefined;
}> = ({ getChart }) => {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const [pos, setPos] = React.useState({ top: 0, right: 0 });

  const openMenu = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({
        top: r.bottom + window.scrollY + 6,
        right: window.innerWidth - r.right,
      });
    }
    setOpen(true);
  };

  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      )
        setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const run = (action: (c: HCExportChart) => void) => {
    const chart = getChart();
    if (chart) action(chart);
    setOpen(false);
  };

  const menu = open ? (
    <div
      ref={menuRef}
      style={{
        position: "absolute",
        top: pos.top,
        right: pos.right,
        zIndex: 9999,
      }}
      className="
        min-w-[175px]
        rounded-xs border border-neutral-200 dark:border-neutral-700
        bg-white dark:bg-neutral-800
        shadow-xl shadow-black/10 dark:shadow-black/40
        py-1 overflow-hidden
      "
    >
      {EXPORT_ITEMS.map((item, i) =>
        item.type === "separator" ? (
          <div
            key={i}
            className="my-1 border-t border-neutral-100 dark:border-neutral-700"
          />
        ) : (
          <button
            key={i}
            onMouseDown={(e) => {
              e.preventDefault();
              run(item.action);
            }}
            className="
              w-full flex items-center gap-2.5 px-3.5 py-2 text-xs
              text-neutral-700 dark:text-neutral-200
              hover:bg-neutral-50 dark:hover:bg-neutral-700/60
              transition-colors duration-100
            "
          >
            <span className="text-neutral-400 dark:text-neutral-500">
              {item.icon}
            </span>
            {item.label}
          </button>
        ),
      )}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="
          glass-morphism-button
          flex items-center gap-2 px-3 py-1.5 rounded-xs text-xs font-medium
          transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2
          dark:focus:ring-offset-neutral-900
          bg-transparent border border-primary-500 dark:border-primary-400
          text-primary-500 dark:text-primary-400
          hover:bg-primary-500/10 dark:hover:bg-primary-400/20
          focus:ring-primary-300 dark:focus:ring-primary-800
        "
        title="Export"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {createPortal(menu, document.body)}
    </>
  );
};

// ── Data transformers ─────────────────────────────────────────────────────────
const toLineSeries = (s: ChartSeries[]) =>
  s.map((x) => ({ name: x.name, data: x.data.map((p) => p.value) }));
const toAreaSeries = (s: ChartSeries[]) =>
  s.map((x) => ({ name: x.name, data: x.data.map((p) => p.value) }));
const toRadarSeries = (s: ChartSeries[]) =>
  s.map((x) => ({ name: x.name, data: x.data.map((p) => p.value) }));
const toBarSeries = (s: ChartSeries[]) =>
  s.map((x) => ({ name: x.name, data: x.data.map((p) => p.value) }));
const toBubbleSeries = (s: ChartSeries[]) =>
  s.map((x) => ({
    name: x.name,
    opacity: x.opacity,
    data: x.data.map(
      (p, i) =>
        [p.x ?? i, p.value, p.size ?? p.value] as [number, number, number],
    ),
  }));
const toPieSeries = (s: ChartSeries[]) =>
  s.map((x) => ({
    name: x.name,
    data: x.data.map((p) => ({
      name: p.name,
      y: p.value,
      z: p.size ?? p.value,
      color: p.color,
    })),
  }));

// ── Component ─────────────────────────────────────────────────────────────────
const ChartCard: React.FC<ChartCardProps> = ({
  title,
  allowedChartTypes = ["line", "bubble"],
  defaultChartType,
  storageKey,
  tableContent,
  defaultView = "chart",
  categories = [],
  series,
  yAxisTitle,
  yAxisSuffix,
  tooltipSuffix,
  xAxisTitle,
  valueLabel = "Value",
  sizeLabel = "Size",
  areaFillOpacity,
  //   areaFillStyle,
  areaTooltipPointFormat,
  areaAccessibilityDescription,
  areaAllowDecimalsX,
  radarYMin,
  radarYMax,
  radarTickAmount,
  radarChartStyle,
  radarFillOpacity,
  radarValueLabel,
  gaugeValue,
  gaugeName,
  gaugeValueSuffix,
  gaugeMin,
  gaugeMax,
  gaugePlotBands,
  gaugeArcStyle,
  gaugeHeight,
  bubbleXAxisMin,
  bubbleXAxisMax,
  bubbleYAxisMin,
  bubbleYAxisMax,
  bubbleZoomable = true,
  bubbleMaxSize,
  bubbleMinSize,
  barShowDataLabels,
  barShowLegend,
}) => {
  const isDark = useDarkMode();

  // ── View state ────────────────────────────────────────────────────────────
  const viewKey = storageKey ? `chartcard-view-${storageKey}` : null;
  const [activeView, setActiveView] = React.useState<"chart" | "table">(() => {
    if (viewKey) {
      const saved = localStorage.getItem(viewKey);
      if (saved === "chart" || saved === "table") return saved;
    }
    return defaultView;
  });
  const handleViewChange = (view: "chart" | "table") => {
    setActiveView(view);
    if (viewKey) localStorage.setItem(viewKey, view);
  };

  // ── Chart type state ──────────────────────────────────────────────────────
  const typeKey = storageKey ? `chartcard-type-${storageKey}` : null;
  const [activeChart, setActiveChart] = React.useState<ChartType>(() => {
    if (typeKey) {
      const saved = localStorage.getItem(typeKey);
      if (saved && allowedChartTypes.includes(saved as ChartType))
        return saved as ChartType;
    }
    return defaultChartType ?? allowedChartTypes[0] ?? "line";
  });
  const handleChartTypeChange = (type: ChartType) => {
    setActiveChart(type);
    if (typeKey) localStorage.setItem(typeKey, type);
  };

  const visibleTabs = CHART_TABS.filter((t) =>
    allowedChartTypes.includes(t.key),
  );

  // ── Chart instance lookup ─────────────────────────────────────────────────
  const chartBodyRef = React.useRef<HTMLDivElement>(null);

  const getActiveChart = React.useCallback((): HCExportChart | undefined => {
    if (!chartBodyRef.current) return undefined;
    return (Highcharts.charts as Array<Highcharts.Chart | undefined>).find(
      (c) => c && chartBodyRef.current!.contains(c.container),
    );
  }, []);

  // ── Memoised series transforms ────────────────────────────────────────────
  const lineSeries = React.useMemo(() => toLineSeries(series), [series]);
  const areaSeries = React.useMemo(() => toAreaSeries(series), [series]);
  const radarSeries = React.useMemo(() => toRadarSeries(series), [series]);
  const barSeries = React.useMemo(() => toBarSeries(series), [series]);
  const bubbleSeries = React.useMemo(() => toBubbleSeries(series), [series]);
  const pieSeries = React.useMemo(() => toPieSeries(series), [series]);

  return (
    <div className="glass-morphism-card rounded-xl sm:rounded-2xl overflow-hidden">    

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div ref={chartBodyRef} className="sm:px-3 py-5">
        {activeView === "table" && tableContent ? (
          tableContent
        ) : (
          <>
            {activeChart === "line" && (
              <LineChart
                categories={categories}
                series={lineSeries}
                yAxisTitle={yAxisTitle}
                yAxisSuffix={yAxisSuffix}
                isDark={isDark}
              />
            )}
            {activeChart === "area" && (
              <AreaChart
                categories={categories}
                series={areaSeries}
                yAxisTitle={yAxisTitle}
                yAxisSuffix={yAxisSuffix}
                defaultFillOpacity={areaFillOpacity}
                // fillStyle={areaFillStyle}
                tooltipPointFormat={areaTooltipPointFormat}
                accessibilityDescription={areaAccessibilityDescription}
                allowDecimalsX={areaAllowDecimalsX}
                isDark={isDark}
              />
            )}
            {activeChart === "radar" && (
              <RadarChart
                categories={categories}
                series={radarSeries}
                yAxisTitle={yAxisTitle}
                yAxisSuffix={yAxisSuffix}
                yMin={radarYMin}
                yMax={radarYMax}
                tickAmount={radarTickAmount}
                chartStyle={radarChartStyle}
                defaultFillOpacity={radarFillOpacity}
                valueLabel={radarValueLabel}
                isDark={isDark}
              />
            )}
            {activeChart === "gauge" && (
              <GaugeChart
                title={title}
                min={gaugeMin}
                max={gaugeMax}
                plotBands={gaugePlotBands}
                arcStyle={gaugeArcStyle}
                height={gaugeHeight}
                isDark={isDark}
                series={[
                  {
                    name: gaugeName ?? series[0]?.name ?? "Value",
                    value: gaugeValue ?? series[0]?.data[0]?.value ?? 0,
                    valueSuffix: gaugeValueSuffix ?? yAxisSuffix,
                  },
                ]}
              />
            )}
            {activeChart === "bar" && (
              <BarChart
                categories={categories}
                series={barSeries}
                yAxisTitle={yAxisTitle}
                tooltipSuffix={tooltipSuffix}
                showDataLabels={barShowDataLabels}
                showLegend={barShowLegend}
                isDark={isDark}
              />
            )}
            {activeChart === "bubble" && (
              <BubblesChart
                series={bubbleSeries}
                xAxisTitle={xAxisTitle}
                yAxisTitle={yAxisTitle}
                xAxisMin={bubbleXAxisMin}
                xAxisMax={bubbleXAxisMax}
                yAxisMin={bubbleYAxisMin}
                yAxisMax={bubbleYAxisMax}
                zoomable={bubbleZoomable}
                maxSize={bubbleMaxSize}
                minSize={bubbleMinSize}
                isDark={isDark}
              />
            )}
            {activeChart === "pie" && (
              <PieChart
                series={pieSeries}
                yLabel={valueLabel}
                zLabel={sizeLabel}
                isDark={isDark}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChartCard;
