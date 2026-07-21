import React from "react";

interface ProjectionPoint {
  month: string;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  repayment_target: number;
}

interface ForecastChartProps {
  projections: ProjectionPoint[];
}

export const ForecastChart: React.FC<ForecastChartProps> = ({ projections }) => {
  if (!projections || projections.length === 0) return null;

  // Chart dimension configuration
  const width = 600;
  const height = 300;
  const paddingX = 60;
  const paddingY = 40;

  // Find boundaries of data to establish scaling bounds
  const allValues = projections.flatMap((p) => [
    p.p10,
    p.p25,
    p.median,
    p.p75,
    p.p90,
    p.repayment_target,
  ]);
  const maxVal = Math.max(...allValues) * 1.15; // 15% head room
  const minVal = Math.min(...allValues, 0) * 1.15; // include 0 or lowest negative value

  const scaleX = (index: number) => {
    return paddingX + (index / (projections.length - 1)) * (width - 2 * paddingX);
  };

  const scaleY = (value: number) => {
    const scale = (height - 2 * paddingY) / (maxVal - minVal);
    return height - paddingY - (value - minVal) * scale;
  };

  // Generate coordinates for SVG paths
  const points = projections.map((p, idx) => ({
    x: scaleX(idx),
    p10: scaleY(p.p10),
    p25: scaleY(p.p25),
    median: scaleY(p.median),
    p75: scaleY(p.p75),
    p90: scaleY(p.p90),
    repayment: scaleY(p.repayment_target),
    monthLabel: p.month,
  }));

  // Create SVG path strings for area bands
  // 1. Area p10 to p90
  const area10To90Points = [
    ...points.map((p) => `${p.x},${p.p90}`),
    ...[...points].reverse().map((p) => `${p.x},${p.p10}`),
  ];
  const path10To90 = `M ${area10To90Points.join(" L ")} Z`;

  // 2. Area p25 to p75
  const area25To75Points = [
    ...points.map((p) => `${p.x},${p.p75}`),
    ...[...points].reverse().map((p) => `${p.x},${p.p25}`),
  ];
  const path25To75 = `M ${area25To75Points.join(" L ")} Z`;

  // 3. Line for Median
  const pathMedian = `M ${points.map((p) => `${p.x},${p.median}`).join(" L ")}`;

  // 4. Line for Repayment Target
  const pathRepayment = `M ${points.map((p) => `${p.x},${p.repayment}`).join(" L ")}`;

  return (
    <div className="panel" style={{ width: "100%", backgroundColor: "var(--bg-secondary)" }}>
      <div className="panel-header">
        <h4 className="panel-title">Probabilistic Cash Flow Projection (6 Months)</h4>
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <span style={{ display: "inline-block", width: "10px", height: "10px", backgroundColor: "rgba(59, 130, 246, 0.15)" }}></span>
            10%-90% Range
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <span style={{ display: "inline-block", width: "10px", height: "10px", backgroundColor: "rgba(59, 130, 246, 0.35)" }}></span>
            25%-75% Range
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <span style={{ display: "inline-block", width: "12px", height: "2px", backgroundColor: "var(--accent-blue)" }}></span>
            Median Forecast
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <span style={{ display: "inline-block", width: "12px", height: "2px", borderTop: "2px dashed #f59e0b" }}></span>
            Repayment Target
          </span>
        </div>
      </div>

      <div style={{ position: "relative", width: "100%", height: `${height}px` }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const val = minVal + ratio * (maxVal - minVal);
            const y = scaleY(val);
            return (
              <g key={idx}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#242936" strokeDasharray="3,3" />
                <text
                  x={paddingX - 10}
                  y={y}
                  fill="var(--text-muted)"
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                  textAnchor="end"
                  alignmentBaseline="middle"
                >
                  {val.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </text>
              </g>
            );
          })}

          {/* Shaded Confidence Intervals */}
          <path d={path10To90} fill="rgba(59, 130, 246, 0.15)" stroke="none" />
          <path d={path25To75} fill="rgba(59, 130, 246, 0.35)" stroke="none" />

          {/* Median Line */}
          <path d={pathMedian} fill="none" stroke="var(--accent-blue)" strokeWidth="2.5" />

          {/* Repayment Limit line */}
          <path d={pathRepayment} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,5" />

          {/* Month labels and vertical ticks */}
          {points.map((p, idx) => (
            <g key={idx}>
              <line x1={p.x} y1={height - paddingY} x2={p.x} y2={height - paddingY + 5} stroke="var(--border-color)" />
              <text
                x={p.x}
                y={height - paddingY + 20}
                fill="var(--text-secondary)"
                fontSize="10"
                fontFamily="var(--font-mono)"
                textAnchor="middle"
              >
                {p.monthLabel}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};
