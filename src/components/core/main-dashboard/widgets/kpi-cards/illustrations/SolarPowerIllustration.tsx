import { motion } from "framer-motion";

export function SolarPowerIllustration() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="h-14 w-14 shrink-0 text-emerald-500/80 dark:text-emerald-400/80"
      aria-hidden
    >
      <defs>
        <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <motion.circle
        cx="60"
        cy="38"
        r="18"
        fill="url(#sunGrad)"
        animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <motion.line
          key={angle}
          x1="60"
          y1="38"
          x2={60 + Math.cos((angle * Math.PI) / 180) * 28}
          y2={38 + Math.sin((angle * Math.PI) / 180) * 28}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: angle / 360 }}
        />
      ))}
      <rect x="18" y="72" width="84" height="34" rx="4" fill="currentColor" opacity="0.15" />
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={24 + col * 20}
            y={76 + row * 9}
            width="14"
            height="6"
            rx="1"
            fill="currentColor"
            opacity={0.35 + row * 0.1}
          />
        )),
      )}
      <motion.path
        d="M30 106 Q60 98 90 106"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.4"
        animate={{ pathLength: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </svg>
  );
}
