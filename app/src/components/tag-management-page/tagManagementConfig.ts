export const MAX_TAGS = 20;
export const ROW_HEIGHT = 52;
export const LONG_PRESS_MS = 180;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
