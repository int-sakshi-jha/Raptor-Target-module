import { motion } from "framer-motion";

export function RevenueIllustration() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="h-14 w-14 shrink-0 text-brand-500/90 dark:text-brand-400/90"
      aria-hidden
    >
      <motion.circle
        cx="60"
        cy="60"
        r="34"
        fill="currentColor"
        opacity="0.08"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.path
        d="M34 78 L48 52 L62 66 L78 38 L88 78 Z"
        fill="currentColor"
        opacity="0.2"
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <text
        x="60"
        y="68"
        textAnchor="middle"
        fontSize="28"
        fontWeight="700"
        fill="currentColor"
      >
        ₹
      </text>
      {[0, 1, 2].map((i) => (
        <motion.rect
          key={i}
          x={28 + i * 24}
          y={88}
          width="16"
          height={10 + i * 6}
          rx="2"
          fill="currentColor"
          opacity={0.25 + i * 0.15}
          animate={{ height: [10 + i * 6, 14 + i * 6, 10 + i * 6] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </svg>
  );
}
