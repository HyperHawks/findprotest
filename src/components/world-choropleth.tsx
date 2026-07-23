import { useEffect, useState, useCallback } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from "react-simple-maps";
import { PROTEST_FILL } from "@/lib/protest-colors";
import type { CountryStat, Protest } from "@/lib/queries";

// TopoJSON world atlas served over CDN — no API key required.
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type Iso = { alpha2: string; numeric: string };

// Approximate country centers for zoom targets
const COUNTRY_CENTERS: Record<string, [number, number]> = {
  AF: [65, 33], AL: [20, 41], DZ: [3, 28], AO: [18.5, -12.5], AR: [-64, -34], AU: [133, -25],
  AT: [14, 47.5], BD: [90, 24], BE: [4, 50.8], BO: [-65, -17], BR: [-52, -10], BG: [25, 43],
  CA: [-95, 60], CL: [-71, -35], CN: [105, 35], CO: [-72, 4], CR: [-84, 10], HR: [16, 45],
  CU: [-80, 22], CY: [33, 35], CZ: [15, 50], DK: [10, 56], DO: [-70, 19], EC: [-78, -2],
  EG: [30, 27], SV: [-89, 14], ET: [40, 9], FI: [26, 64], FR: [2, 46], GE: [44, 42],
  DE: [10, 51], GH: [-1.5, 8], GR: [22, 39], GT: [-90.5, 15.5], HT: [-72, 19], HN: [-87, 15],
  HU: [20, 47], IS: [-19, 65], IN: [79, 21], ID: [113, -1], IR: [53, 32], IQ: [44, 33],
  IE: [-8, 53], IL: [35, 31], IT: [12, 42], JP: [138, 36], KZ: [67, 49], JO: [37, 31],
  KE: [38, 1], KR: [128, 36], KW: [48, 29.5], MX: [-102, 23], MN: [104, 46], MA: [-5, 32],
  NL: [5.5, 52], NZ: [174, -41], NG: [8, 10], NO: [10, 62], PK: [70, 30], PA: [-80, 9],
  PY: [-58, -23], PE: [-76, -10], PH: [122, 13], PL: [20, 52], PT: [-8, 39.5], RO: [25, 46],
  RU: [100, 60], SA: [45, 24], RS: [21, 44], SG: [104, 1.35], ZA: [25, -29], ES: [-4, 40],
  SE: [18, 62], CH: [8, 47], TH: [101, 15], TR: [35, 39], UA: [32, 49], AE: [54, 24],
  GB: [-2, 54], US: [-98, 38], VE: [-66, 8], VN: [108, 16],
};

// Zoom level when focusing a country
const COUNTRY_ZOOM = 4;

export function WorldChoropleth({
  stats,
  onCountryClick,
  selectedCountry,
  protests,
}: {
  stats: CountryStat[];
  onCountryClick?: (alpha2: string) => void;
  selectedCountry?: string;
  protests?: Protest[];
}) {
  const [iso, setIso] = useState<Record<string, Iso>>({});
  const [center, setCenter] = useState<[number, number]>([0, 20]);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    import("./iso-lookup").then((m) => setIso(m.NUMERIC_TO_ISO));
  }, []);

  // Animate to country when selected
  useEffect(() => {
    if (selectedCountry && COUNTRY_CENTERS[selectedCountry]) {
      setCenter(COUNTRY_CENTERS[selectedCountry]);
      setZoom(COUNTRY_ZOOM);
    } else if (!selectedCountry) {
      setCenter([0, 20]);
      setZoom(1);
    }
  }, [selectedCountry]);

  const handleCountryClick = useCallback((alpha2: string) => {
    onCountryClick?.(alpha2);
  }, [onCountryClick]);

  const handleZoomOut = useCallback(() => {
    setCenter([0, 20]);
    setZoom(1);
    onCountryClick?.("");
  }, [onCountryClick]);

  const byAlpha2 = new Map(stats.map((s) => [s.country_code.toUpperCase(), s]));
  const indiaBucket = byAlpha2.get("IN")?.color_bucket ?? 0;

  // Overlay polygons so the map reflects India's officially claimed borders
  const indiaClaimed = {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        id: "IN-POK",
        properties: { name: "PoK (claimed by India)" },
        geometry: {
          type: "Polygon" as const,
          coordinates: [[
            [73.0, 37.1], [74.5, 37.1], [76.8, 36.0], [77.2, 34.6],
            [76.0, 33.2], [74.2, 32.5], [73.3, 33.5], [73.0, 34.8], [73.0, 37.1],
          ]],
        },
      },
      {
        type: "Feature" as const,
        id: "IN-AKSAI",
        properties: { name: "Aksai Chin (claimed by India)" },
        geometry: {
          type: "Polygon" as const,
          coordinates: [[
            [78.0, 35.5], [80.3, 35.4], [80.6, 34.3], [79.5, 33.6],
            [78.2, 33.9], [77.9, 34.8], [78.0, 35.5],
          ]],
        },
      },
    ],
  };

  // Protest pins for zoomed view
  const showPins = zoom > 1 && protests && protests.length > 0;

  return (
    <div className="w-full aspect-[2/1] bg-background border-2 border-border relative">
      {/* Zoom out button */}
      {zoom > 1 && (
        <button
          type="button"
          onClick={handleZoomOut}
          className="absolute top-3 left-3 z-10 px-3 py-1.5 border-2 border-border bg-background font-mono text-[10px] font-extrabold uppercase brutal-shadow-sm hover:bg-danger transition-colors"
        >
          ← World view
        </button>
      )}
      {/* Zoom indicator */}
      {selectedCountry && (
        <div className="absolute top-3 right-3 z-10 px-3 py-1.5 border-2 border-border bg-primary font-mono text-[10px] font-extrabold uppercase">
          📍 {selectedCountry}
        </div>
      )}

      <ComposableMap
        projectionConfig={{ scale: 155 }}
        width={980}
        height={490}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup
          center={center}
          zoom={zoom}
          minZoom={1}
          maxZoom={8}
          onMoveEnd={({ coordinates, zoom: z }) => {
            setCenter(coordinates as [number, number]);
            setZoom(z);
          }}
          translateExtent={[[-200, -200], [1200, 700]]}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const numeric = String(geo.id).padStart(3, "0");
                const alpha2 = iso[numeric]?.alpha2;
                const stat = alpha2 ? byAlpha2.get(alpha2) : undefined;
                const bucket = stat?.color_bucket ?? 0;
                const isSelected = alpha2 === selectedCountry;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => alpha2 && handleCountryClick(alpha2)}
                    style={{
                      default: {
                        fill: PROTEST_FILL[bucket],
                        stroke: isSelected ? "#000" : "#000",
                        strokeWidth: isSelected ? 1.5 : 0.4,
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
          {/* Overlay: render PoK and Aksai Chin as part of India (India's claimed borders). */}
          <Geographies geography={indiaClaimed}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() => handleCountryClick("IN")}
                  style={{
                    default: {
                      fill: PROTEST_FILL[indiaBucket],
                      stroke: "#000",
                      strokeWidth: 0.4,
                      outline: "none",
                      cursor: "pointer",
                    },
                    hover: {
                      fill: PROTEST_FILL[Math.min(5, indiaBucket + 1)],
                      stroke: "#000",
                      strokeWidth: 1,
                      outline: "none",
                    },
                    pressed: { fill: PROTEST_FILL[5], outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Protest pin markers */}
          {showPins && protests!.filter((p) => p.lat && p.lng).map((p) => (
            <Marker key={p.id} coordinates={[p.lng!, p.lat!]}>
              <g transform="translate(-6, -20)">
                <path
                  d="M6 0C2.7 0 0 2.7 0 6c0 4.5 6 14 6 14s6-9.5 6-14c0-3.3-2.7-6-6-6z"
                  fill="var(--danger)"
                  stroke="#000"
                  strokeWidth="0.5"
                />
                <circle cx="6" cy="6" r="2.5" fill="#fff" />
              </g>
              <text
                textAnchor="middle"
                y={8}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "3px",
                  fontWeight: 800,
                  fill: "#000",
                  textTransform: "uppercase",
                }}
              >
                {p.title.slice(0, 20)}
              </text>
            </Marker>
          ))}
        </ZoomableGroup>
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
