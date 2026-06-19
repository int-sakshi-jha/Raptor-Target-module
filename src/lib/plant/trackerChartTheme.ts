import { useEffect, useState } from "react";

export interface TrackerChartTheme {
  isDark: boolean;
  gridLine: string;
  axisLine: string;
  axisLabel: string;
  legend: string;
  plotLine: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tooltipMuted: string;
}

export function getTrackerChartTheme(isDark: boolean): TrackerChartTheme {
  if (isDark) {
    return {
      isDark: true,
      gridLine: "rgba(148, 163, 184, 0.1)",
      axisLine: "rgba(148, 163, 184, 0.22)",
      axisLabel: "#94a3b8",
      legend: "#94a3b8",
      plotLine: "rgba(148, 163, 184, 0.4)",
      tooltipBg: "rgba(15, 23, 42, 0.96)",
      tooltipBorder: "rgba(71, 85, 105, 0.6)",
      tooltipText: "#e2e8f0",
      tooltipMuted: "#94a3b8",
    };
  }

  return {
    isDark: false,
    gridLine: "rgba(148, 163, 184, 0.2)",
    axisLine: "#e5e7eb",
    axisLabel: "#6b7280",
    legend: "#6b7280",
    plotLine: "#9ca3af",
    tooltipBg: "rgba(255, 255, 255, 0.96)",
    tooltipBorder: "#e5e7eb",
    tooltipText: "#1f2937",
    tooltipMuted: "#6b7280",
  };
}

function readIsDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/** Reacts to `dark` class on `<html>` (same as ThemeToggle). */
export function useTrackerChartTheme(): TrackerChartTheme {
  const [isDark, setIsDark] = useState(readIsDarkMode);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return getTrackerChartTheme(isDark);
}
