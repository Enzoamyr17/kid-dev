// Utilities for generating distinct, consistent colors for charts
// Ensures:
// - Same label => same color across renders (stable hashing)
// - Different labels in the same chart => distinct colors (min hue separation)

const GOLDEN_ANGLE = 137.508; // degrees

function hashStringToNumber(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function hslToRgbCss(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

function generateBaseHue(label: string): number {
  // Map label hash to a hue [0, 360)
  const hash = hashStringToNumber(label);
  return hash % 360;
}

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Generate distinct colors for labels with a guaranteed minimum hue separation.
 * - Stable: sorting labels before assignment makes mapping deterministic for a given set
 * - Separated: ensures at least `minHueDistance` degrees between hues in the same chart
 */
export function getColorsForLabels(
  labels: string[],
  options?: { saturation?: number; lightness?: number; minHueDistance?: number }
): string[] {
  const saturation = options?.saturation ?? 65;
  const lightness = options?.lightness ?? 55;
  const minHueDistance = options?.minHueDistance ?? 36; // 10 distinct colors around the wheel at minimum

  // Work with unique labels only
  const uniqueLabels = Array.from(new Set(labels));

  // Sort labels for stable assignment regardless of input order
  const sorted = [...uniqueLabels].sort((a, b) => a.localeCompare(b));

  const labelToHue = new Map<string, number>();
  const chosenHues: number[] = [];

  for (const label of sorted) {
    let hue = generateBaseHue(label);
    let attempts = 0;
    // Ensure minimum separation from already chosen hues
    while (
      chosenHues.some((h) => hueDistance(h, hue) < minHueDistance) &&
      attempts < uniqueLabels.length + 24
    ) {
      hue = (hue + GOLDEN_ANGLE) % 360;
      attempts++;
    }
    chosenHues.push(hue);
    labelToHue.set(label, hue);
  }

  // Map back to the original order
  return labels.map((label) => {
    const hue = labelToHue.get(label) ?? generateBaseHue(label);
    return hslToRgbCss(hue, saturation, lightness);
  });
}

/**
 * Helper for two-series charts (e.g., Income vs Expenses)
 */
export function getColorsForSeries(seriesNames: string[], options?: { saturation?: number; lightness?: number }): {
  background: string[];
  border: string[];
} {
  const backgrounds = getColorsForLabels(seriesNames, options);
  // Borders: slightly darker for definition
  const borderColors = backgrounds.map((bg) => {
    // Extract hue,s,l from hsl string
    const match = bg.match(/hsl\((\d+),\s*(\d+)%\,\s*(\d+)%\)/i);
    if (!match) return bg;
    const hue = Number(match[1]);
    const sat = Number(match[2]);
    const light = Math.max(0, Number(match[3]) - 10);
    return hslToRgbCss(hue, sat, light);
  });
  return { background: backgrounds, border: borderColors };
}


