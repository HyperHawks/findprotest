import { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { PROTEST_FILL } from "@/lib/protest-colors";
import type { CountryStat } from "@/lib/queries";

// TopoJSON world atlas served over CDN — no API key required.
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// world-atlas uses numeric ISO-3166 codes; we map to alpha-2 for our stats join.
// Small runtime helper — dynamic import to keep bundle small.
type Iso = { alpha2: string; numeric: string };

export function WorldChoropleth({
  stats,
  onCountryClick,
}: {
  stats: CountryStat[];
  onCountryClick?: (alpha2: string) => void;
}) {
  const [iso, setIso] = useState<Record<string, Iso>>({});
  useEffect(() => {
    // Tiny inline lookup avoids adding another dep — covers major countries.
    // For a full production build we would load a complete list.
    import("./iso-lookup").then((m) => setIso(m.NUMERIC_TO_ISO));
  }, []);

  const byAlpha2 = new Map(stats.map((s) => [s.country_code.toUpperCase(), s]));

  return (
    <div className="w-full aspect-[2/1] bg-background border-2 border-border">
      <ComposableMap
        projectionConfig={{ scale: 155 }}
        width={980}
        height={490}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const numeric = String(geo.id).padStart(3, "0");
              const alpha2 = iso[numeric]?.alpha2;
              const stat = alpha2 ? byAlpha2.get(alpha2) : undefined;
              const bucket = stat?.color_bucket ?? 0;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() => alpha2 && onCountryClick?.(alpha2)}
                  style={{
                    default: {
                      fill: PROTEST_FILL[bucket],
                      stroke: "#000",
                      strokeWidth: 0.4,
                      outline: "none",
                      cursor: alpha2 ? "pointer" : "default",
                    },
                    hover: {
                      fill: PROTEST_FILL[Math.min(5, bucket + 1)],
                      stroke: "#000",
                      strokeWidth: 1,
                      outline: "none",
                    },
                    pressed: { fill: PROTEST_FILL[5], outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}

export function IntensityLegend() {
  return (
    <div className="flex items-center gap-3 border-2 border-border bg-card p-3">
      <span className="text-[10px] font-mono font-extrabold uppercase">Intensity</span>
      <div className="flex">
        {[0, 1, 2, 3, 4, 5].map((b) => (
          <div key={b} className="size-5 border-2 border-border -ml-[2px] first:ml-0" style={{ background: PROTEST_FILL[b] }} />
        ))}
      </div>
      <span className="text-[10px] font-mono font-extrabold uppercase">Calm → Critical</span>
    </div>
  );
}
