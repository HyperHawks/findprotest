// Orange->red heatmap spectrum for country choropleth.
// Buckets 0..5 map to CSS tokens defined in styles.css.
export const PROTEST_FILL: Record<number, string> = {
  0: "var(--protest-0)",
  1: "var(--protest-1)",
  2: "var(--protest-2)",
  3: "var(--protest-3)",
  4: "var(--protest-4)",
  5: "var(--protest-5)",
};

export function bucketForCount(count: number): number {
  if (count <= 0) return 0;
  if (count < 3) return 1;
  if (count < 8) return 2;
  if (count < 20) return 3;
  if (count < 50) return 4;
  return 5;
}

export const CAUSE_TAGS = [
  "climate",
  "labor",
  "civil-rights",
  "anti-war",
  "housing",
  "education",
  "healthcare",
  "democracy",
  "womens-rights",
  "indigenous",
  "lgbtq",
  "anti-corruption",
] as const;
export type CauseTag = (typeof CAUSE_TAGS)[number];
