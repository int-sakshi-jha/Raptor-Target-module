/** Allowed virtual device numbers across forms and the smart-plant palette. */
export const VD_NUMBER_MIN = 1;
export const VD_NUMBER_MAX = 25;

export const VD_NUMBER_OPTIONS: readonly number[] = Array.from(
  { length: VD_NUMBER_MAX - VD_NUMBER_MIN + 1 },
  (_, i) => VD_NUMBER_MIN + i,
);
