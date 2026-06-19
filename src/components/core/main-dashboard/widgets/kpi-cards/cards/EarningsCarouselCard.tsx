import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, IndianRupee } from "lucide-react";
import type { KpiAggregateMetrics } from "@/components/core/main-dashboard/types/dashboard.types";
import { GlassCard } from "@/components/core/main-dashboard/shared/GlassCard";
import { AnimatedCounter } from "@/components/core/main-dashboard/shared/AnimatedCounter";
import { RevenueIllustration } from "../illustrations/RevenueIllustration";
import { useMainDashboardStore } from "@/components/core/main-dashboard/store/mainDashboardStore";

interface EarningsCarouselCardProps {
  earnings: KpiAggregateMetrics["earnings"];
  loading?: boolean;
}

const SLIDES = [
  { key: "daily", label: "Daily", earningsKey: "daily" as const },
  { key: "weekly", label: "Weekly", earningsKey: "weekly" as const },
  { key: "monthly", label: "Monthly", earningsKey: "monthly" as const },
  { key: "yearly", label: "Yearly", earningsKey: "yearly" as const },
] as const;

const AUTO_INTERVAL_MS = 5_000;

export function EarningsCarouselCard({ earnings, loading = false }: EarningsCarouselCardProps) {
  const [index, setIndex] = useState(0);
  const setKpiCarouselIndex = useMainDashboardStore((s) => s.setKpiCarouselIndex);

  const goTo = useCallback(
    (next: number) => {
      const wrapped = (next + SLIDES.length) % SLIDES.length;
      setIndex(wrapped);
      setKpiCarouselIndex(wrapped);
    },
    [setKpiCarouselIndex],
  );

  useEffect(() => {
    const timer = window.setInterval(() => goTo(index + 1), AUTO_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [goTo, index]);

  const slide = SLIDES[index]!;
  const slideData = earnings[slide.earningsKey];

  return (
    <GlassCard accent="brand" className="min-h-[130px]">
      <div className="flex h-full flex-col p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-dark-600">
            Earnings · <span className="text-brand-600 dark:text-brand-400">{slide.label}</span>
          </p>
          <RevenueIllustration />
        </div>

        <div className="relative mt-2 min-h-[64px] flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.key}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="grid grid-cols-2 gap-2"
            >
              <div className="rounded-sm border border-brand-400/20 bg-brand-500/5 p-2 dark:border-brand-400/15 dark:bg-brand-500/10">
                <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
                  <IndianRupee className="h-3 w-3" />
                  Earnings
                </div>
                {loading ? (
                  <div className="h-6 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-dark-300" />
                ) : (
                  <AnimatedCounter
                    value={slideData.earnings}
                    decimals={0}
                    prefix="₹"
                    className="text-lg font-bold text-brand-700 dark:text-brand-300 sm:text-xl"
                  />
                )}
              </div>
              <div className="rounded-sm border border-neutral-200/80 bg-white/50 p-2 dark:border-neutral-dark-300/60 dark:bg-neutral-dark-200/30">
                <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-dark-600">
                  <Clock className="h-3 w-3" />
                  Full Load
                </div>
                {loading ? (
                  <div className="h-6 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-dark-300" />
                ) : (
                  <AnimatedCounter
                    value={slideData.fullLoadHours}
                    decimals={2}
                    suffix=" h"
                    className="text-lg font-bold text-neutral-800 dark:text-neutral-dark-900 sm:text-xl"
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {SLIDES.map((item, dotIndex) => (
              <button
                key={item.key}
                type="button"
                aria-label={`Go to ${item.label} slide`}
                onClick={() => goTo(dotIndex)}
                className="group p-0.5"
              >
                <span
                  className={[
                    "block h-1 rounded-full transition-all duration-300",
                    dotIndex === index
                      ? "w-4 bg-brand-500"
                      : "w-1 bg-neutral-300 group-hover:bg-neutral-400 dark:bg-neutral-dark-400",
                  ].join(" ")}
                />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => goTo(index - 1)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-neutral-200/80 bg-white/70 text-neutral-600 dark:border-neutral-dark-300/60 dark:bg-neutral-dark-200/40 dark:text-neutral-dark-800"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => goTo(index + 1)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-neutral-200/80 bg-white/70 text-neutral-600 dark:border-neutral-dark-300/60 dark:bg-neutral-dark-200/40 dark:text-neutral-dark-800"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
