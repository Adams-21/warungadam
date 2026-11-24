import { EmptyState } from "@/components/ui";
import { formatRupiah } from "@/lib/format";
import type { DashboardTrendPoint } from "./dashboard-rules";

const WIDTH = 720;
const HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 32, left: 56 };

function compactValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
  if (abs >= 1_000) return `${Math.round(value / 1_000)}rb`;
  return String(value);
}

function buildPoints(values: number[], min: number, max: number, count: number) {
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const range = max - min || 1;
  return values.map((value, index) => {
    const x =
      count <= 1
        ? PADDING.left + plotWidth / 2
        : PADDING.left + (plotWidth * index) / (count - 1);
    const y = PADDING.top + plotHeight - ((value - min) / range) * plotHeight;
    return { x, y };
  });
}

export function DashboardChart({
  points,
  granularity,
}: {
  points: DashboardTrendPoint[];
  granularity: "daily" | "monthly";
}) {
  if (points.length === 0) {
    return (
      <EmptyState
        title="Tidak ada data tren"
        description="Tidak ada data tren pada periode ini."
      />
    );
  }

  const values = points.flatMap((point) => [
    Number(point.total_sales),
    Number(point.gross_profit),
    Number(point.net_profit),
    0,
  ]);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const paddedMax = max === min ? max + 1 : max;
  const gridValues = [paddedMax, (paddedMax + min) / 2, min];
  const gridPoints = buildPoints(gridValues, min, paddedMax, gridValues.length);

  const series = [
    {
      label: "Penjualan",
      color: "#18181b",
      data: points.map((point) => Number(point.total_sales)),
    },
    {
      label: "Laba Kotor",
      color: "#059669",
      data: points.map((point) => Number(point.gross_profit)),
    },
    {
      label: "Laba Bersih",
      color: "#2563eb",
      data: points.map((point) => Number(point.net_profit)),
    },
  ].map((item) => ({
    ...item,
    points: buildPoints(item.data, min, paddedMax, points.length),
  }));

  const labelIndexes = Array.from(
    new Set([
      0,
      Math.floor((points.length - 1) / 2),
      points.length - 1,
    ]),
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-zinc-600">
        {series.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
        <span className="ml-auto text-zinc-500">
          {granularity === "daily" ? "Per hari" : "Per bulan"}
        </span>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-56 w-full sm:h-64"
          role="img"
          aria-label="Grafik tren penjualan, laba kotor, dan laba bersih"
          preserveAspectRatio="none"
        >
          {gridPoints.map((grid, index) => (
            <g key={gridValues[index]}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={grid.y}
                y2={grid.y}
                stroke="#e4e4e7"
                strokeDasharray="4 4"
              />
              <text
                x={PADDING.left - 8}
                y={grid.y + 4}
                textAnchor="end"
                className="fill-zinc-500 text-[10px]"
              >
                {compactValue(gridValues[index])}
              </text>
            </g>
          ))}

          {labelIndexes.map((index) => {
            const point = buildPoints([0], min, paddedMax, 1)[0];
            const x =
              points.length <= 1
                ? point!.x
                : PADDING.left +
                  ((WIDTH - PADDING.left - PADDING.right) * index) /
                    (points.length - 1);
            return (
              <text
                key={points[index]!.key}
                x={x}
                y={HEIGHT - 10}
                textAnchor="middle"
                className="fill-zinc-500 text-[10px]"
              >
                {points[index]!.label}
              </text>
            );
          })}

          {series.map((item) => (
            <polyline
              key={item.label}
              points={item.points.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke={item.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {points.length <= 31
            ? series.flatMap((item) =>
                item.points.map((point, index) => (
                  <circle
                    key={`${item.label}-${points[index]!.key}`}
                    cx={point.x}
                    cy={point.y}
                    r={3}
                    fill="#ffffff"
                    stroke={item.color}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  >
                    <title>
                      {`${item.label} ${points[index]!.label}: ${formatRupiah(item.data[index]!)}`}
                    </title>
                  </circle>
                )),
              )
            : null}
        </svg>
      </div>
    </div>
  );
}
