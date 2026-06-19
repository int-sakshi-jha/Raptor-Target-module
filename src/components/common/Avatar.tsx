import React, { useMemo, useState } from "react";

const AVATAR_COLORS = [
  {
    bg: "bg-red-500/15 dark:bg-red-500/20",
    text: "text-red-700 dark:text-red-200",
    border: "border-red-500/30 dark:border-red-400/30",
  },
  {
    bg: "bg-orange-500/15 dark:bg-orange-500/20",
    text: "text-orange-700 dark:text-orange-200",
    border: "border-orange-500/30 dark:border-orange-400/30",
  },
  {
    bg: "bg-amber-500/15 dark:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-200",
    border: "border-amber-500/30 dark:border-amber-400/30",
  },
  {
    bg: "bg-yellow-500/15 dark:bg-yellow-500/20",
    text: "text-yellow-700 dark:text-yellow-200",
    border: "border-yellow-500/30 dark:border-yellow-400/30",
  },
  {
    bg: "bg-lime-500/15 dark:bg-lime-500/20",
    text: "text-lime-700 dark:text-lime-200",
    border: "border-lime-500/30 dark:border-lime-400/30",
  },
  {
    bg: "bg-green-500/15 dark:bg-green-500/20",
    text: "text-green-700 dark:text-green-200",
    border: "border-green-500/30 dark:border-green-400/30",
  },
  {
    bg: "bg-emerald-500/15 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-200",
    border: "border-emerald-500/30 dark:border-emerald-400/30",
  },
  {
    bg: "bg-teal-500/15 dark:bg-teal-500/20",
    text: "text-teal-700 dark:text-teal-200",
    border: "border-teal-500/30 dark:border-teal-400/30",
  },
  {
    bg: "bg-cyan-500/15 dark:bg-cyan-500/20",
    text: "text-cyan-700 dark:text-cyan-200",
    border: "border-cyan-500/30 dark:border-cyan-400/30",
  },
  {
    bg: "bg-sky-500/15 dark:bg-sky-500/20",
    text: "text-sky-700 dark:text-sky-200",
    border: "border-sky-500/30 dark:border-sky-400/30",
  },
  {
    bg: "bg-blue-500/15 dark:bg-blue-500/20",
    text: "text-blue-700 dark:text-blue-200",
    border: "border-blue-500/30 dark:border-blue-400/30",
  },
  {
    bg: "bg-indigo-500/15 dark:bg-indigo-500/20",
    text: "text-indigo-700 dark:text-indigo-200",
    border: "border-indigo-500/30 dark:border-indigo-400/30",
  },
  {
    bg: "bg-violet-500/15 dark:bg-violet-500/20",
    text: "text-violet-700 dark:text-violet-200",
    border: "border-violet-500/30 dark:border-violet-400/30",
  },
  {
    bg: "bg-purple-500/15 dark:bg-purple-500/20",
    text: "text-purple-700 dark:text-purple-200",
    border: "border-purple-500/30 dark:border-purple-400/30",
  },
  {
    bg: "bg-fuchsia-500/15 dark:bg-fuchsia-500/20",
    text: "text-fuchsia-700 dark:text-fuchsia-200",
    border: "border-fuchsia-500/30 dark:border-fuchsia-400/30",
  },
  {
    bg: "bg-pink-500/15 dark:bg-pink-500/20",
    text: "text-pink-700 dark:text-pink-200",
    border: "border-pink-500/30 dark:border-pink-400/30",
  },
  {
    bg: "bg-rose-500/15 dark:bg-rose-500/20",
    text: "text-rose-700 dark:text-rose-200",
    border: "border-rose-500/30 dark:border-rose-400/30",
  },
];

const STOP_WORDS = new Set([
  "solar",
  "plant",
  "project",
  "power",
  "energy",
  "limited",
  "ltd",
  "private",
  "pvt",
  "company",
  "corp",
  "mw",
  "kw",
]);

function hash(str: string) {
  let h = 0;

  for (let i = 0; i < str.length; i++) {
    h = str.charCodeAt(i) + ((h << 5) - h);
  }

  return Math.abs(h);
}

function getInitials(label: string) {
  if (!label?.trim()) return "?";

  const words = label
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean)
    .filter((word) => !/^\d+(\.\d+)?$/.test(word));

  const meaningfulWords = words.filter(
    (word) => !STOP_WORDS.has(word.toLowerCase())
  );

  const finalWords =
    meaningfulWords.length > 0 ? meaningfulWords : words;

  if (finalWords.length === 0) return "?";

  if (finalWords.length === 1) {
    const word = finalWords[0];

    const splitCamel =
      word.match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])|\d+/g) || [];

    if (splitCamel.length > 1) {
      return (
        splitCamel[0][0] +
        splitCamel[splitCamel.length - 1][0]
      ).toUpperCase();
    }

    return word.slice(0, 2).toUpperCase();
  }

  return (
    finalWords[0][0] +
    finalWords[finalWords.length - 1][0]
  ).toUpperCase();
}

export interface AvatarProps {
  label: string;
  src?: string | null;
  seed?: string;
  size?: number;
  className?: string;
  alt?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  label,
  src,
  seed,
  size = 32,
  className = "",
  alt,
}) => {
  const [imageError, setImageError] = useState(false);

  const safeLabel = label?.trim() || "?";

  const initials = useMemo(
    () => getInitials(safeLabel),
    [safeLabel]
  );

  const color = useMemo(() => {
    const key = seed || safeLabel;
    return AVATAR_COLORS[hash(key) % AVATAR_COLORS.length];
  }, [seed, safeLabel]);
  
  const showImage = !!src && !imageError;

  return (
    <div
      className={`
        inline-flex
        shrink-0
        items-center
        justify-center
        overflow-hidden
        rounded-full
        border
        font-semibold
        select-none
        transition-colors
        ${showImage ? "bg-muted border-border/60" : `${color.bg} ${color.text} ${color.border}`}
        ${className}
      `}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.38),
      }}
      title={safeLabel}
      role="img"
      aria-label={alt || safeLabel}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt || safeLabel}
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
};

export default Avatar;