import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  decimals = 2,
  prefix = "",
  suffix = "",
  className = "",
}: AnimatedCounterProps) {
  const spring = useSpring(value, { stiffness: 90, damping: 20, mass: 0.8 });
  const display = useTransform(spring, (latest) =>
    `${prefix}${latest.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`,
  );
  const [text, setText] = useState("");

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on("change", (latest) => setText(latest));
    return () => unsubscribe();
  }, [display]);

  return (
    <motion.span className={`tabular-nums ${className}`} aria-live="polite">
      {text}
    </motion.span>
  );
}
