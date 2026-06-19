import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glowClassName?: string;
  accent?: "emerald" | "amber" | "brand" | "red" | "neutral";
}

const accentMap = {
  emerald: "from-emerald-500/20 via-transparent to-transparent dark:from-emerald-400/15",
  amber: "from-amber-500/20 via-transparent to-transparent dark:from-amber-400/15",
  brand: "from-brand-500/20 via-transparent to-transparent dark:from-brand-400/15",
  red: "from-red-500/20 via-transparent to-transparent dark:from-red-400/15",
  neutral: "from-neutral-500/10 via-transparent to-transparent dark:from-neutral-dark-400/10",
};

export function GlassCard({
  children,
  className = "",
  glowClassName = "",
  accent = "neutral",
}: GlassCardProps) {
  return (
    <article
      className={[
        "group relative flex h-full min-h-[130px] flex-col overflow-hidden rounded-sm border",
        "border-neutral-200/80 bg-white/80 backdrop-blur-xl",
        "dark:border-neutral-dark-300/60 dark:bg-neutral-dark-100/75",
        "shadow-[0_4px_16px_rgba(15,23,42,0.05)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.25)]",
        "transition-shadow duration-200",
        glowClassName,
        className,
      ].join(" ")}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80 ${accentMap[accent]}`}
      />
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/30 blur-2xl dark:bg-white/5" />
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </article>
  );
}
