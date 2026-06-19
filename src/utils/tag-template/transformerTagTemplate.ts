export type TransformerConfigInput = {
  diCount?: number;
  doCount?: number;
  aiCount?: number;
};

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  if (i < min) return min;
  if (i > max) return max;
  return i;
}

export function generateTransformerConfig(input: TransformerConfigInput = {}) {
  const diCount = clampInt(input.diCount, 16, 1, 16);
  const doCount = clampInt(input.doCount, 6, 1, 6);
  const aiCount = clampInt(input.aiCount, 6, 1, 6);

  const tags: Record<string, string> = {};

  for (let i = 1; i <= diCount; i++) {
    tags[`DI${i}`] = `DI${i * 10 + 1}`;
  }

  for (let i = 1; i <= doCount; i++) {
    tags[`DO${i}`] = `DO${i}`;
  }

  for (let i = 1; i <= aiCount; i++) {
    tags[`AI${i}`] = `AI${i * 10 + 1}`;
  }

  if (diCount >= 1) {
    tags.DI1_CDT = "DI11-CDT";
    tags.DI1_DT = "DI11-DT";
    tags.DI1_FDT = "DI11-FDT";
  }

  if (diCount >= 2) {
    tags.DI2_CDT = "DI21-CDT";
    tags.DI2_DT = "DI21-DT";
    tags.DI2_FDT = "DI21-FDT";
  }

  const soft_tags: Record<string, string> = {};

  return {
    ...tags,
    soft_tag: soft_tags,
  };
}
