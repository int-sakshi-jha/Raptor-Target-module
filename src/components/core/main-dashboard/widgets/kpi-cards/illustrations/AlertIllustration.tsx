import { motion } from "framer-motion";

export function AlertIllustration() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="h-14 w-14 shrink-0 text-amber-500/90 dark:text-amber-400/90"
      aria-hidden
    >
      <motion.polygon
        points="60,18 98,92 22,92"
        fill="currentColor"
        opacity="0.12"
        animate={{ opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <polygon
        points="60,24 92,88 28,88"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.7"
      />
      <motion.rect
        x="56"
        y="42"
        width="8"
        height="28"
        rx="2"
        fill="currentColor"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      <motion.circle
        cx="60"
        cy="80"
        r="4"
        fill="currentColor"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
    </svg>
  );
}
