import React, { useState } from "react";

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  value: string;
  status: "stable" | "watch" | "action";
  description: string;
}

interface Edge {
  from: string;
  to: string;
}

interface CausalGraphProps {
  expectedYield: number;
  expectedPrice: number;
  expectedExpenses: number;
  forecastStatus: "stable" | "watch" | "action-required";
  sandboxInputs: {
    rainfall_deviation_pct: number;
    price_deviation_pct: number;
    cost_deviation_pct: number;
    rainfall_delay_weeks: number;
  };
}

export const CausalGraph: React.FC<CausalGraphProps> = ({
  expectedYield,
  expectedPrice,
  expectedExpenses,
  forecastStatus,
  sandboxInputs,
}) => {
  const [selectedNode, setSelectedNode] = useState<string | null>("cash_flow");

  // Dynamically determine node status based on sandbox variables
  const getRainfallStatus = () => {
    const dev = sandboxInputs.rainfall_deviation_pct;
    const delay = sandboxInputs.rainfall_delay_weeks;
    if (dev < -25 || dev > 25 || delay >= 2) return "action";
    if (dev < -10 || dev > 10 || delay > 0) return "watch";
    return "stable";
  };

  const getPriceStatus = () => {
    const dev = sandboxInputs.price_deviation_pct;
    if (dev < -15) return "action";
    if (dev < -5) return "watch";
    return "stable";
  };

  const getExpensesStatus = () => {
    const dev = sandboxInputs.cost_deviation_pct;
    if (dev > 20) return "action";
    if (dev > 8) return "watch";
    return "stable";
  };

  const getYieldStatus = () => {
    const rStat = getRainfallStatus();
    if (rStat === "action") return "action";
    if (rStat === "watch") return "watch";
    return "stable";
  };

  const getRevenueStatus = () => {
    const yStat = getYieldStatus();
    const pStat = getPriceStatus();
    if (yStat === "action" || pStat === "action") return "action";
    if (yStat === "watch" || pStat === "watch") return "watch";
    return "stable";
  };

  const getCashFlowStatus = () => {
    if (forecastStatus === "action-required") return "action";
    if (forecastStatus === "watch") return "watch";
    return "stable";
  };

  const nodes: Node[] = [
    {
      id: "rainfall",
      label: "Monsoon Rainfall",
      x: 100,
      y: 80,
      value: `${sandboxInputs.rainfall_deviation_pct >= 0 ? "+" : ""}${sandboxInputs.rainfall_deviation_pct}% (${sandboxInputs.rainfall_delay_weeks}w delay)`,
      status: getRainfallStatus(),
      description: "Direct input representing climate and seasonal precipitation deviations. Triggers parametric insurance on drought or flooding.",
    },
    {
      id: "price",
      label: "Market wholesale Price",
      x: 350,
      y: 80,
      value: `INR ${expectedPrice.toFixed(1)}/kg (${sandboxInputs.price_deviation_pct >= 0 ? "+" : ""}${sandboxInputs.price_deviation_pct}%)`,
      status: getPriceStatus(),
      description: "Wholesale commodity spot price. Triggers dynamic pricing interest subvention when market rates crash.",
    },
    {
      id: "cost",
      label: "Operational Costs",
      x: 600,
      y: 80,
      value: `INR ${expectedExpenses.toFixed(0)} (${sandboxInputs.cost_deviation_pct >= 0 ? "+" : ""}${sandboxInputs.cost_deviation_pct}%)`,
      status: getExpensesStatus(),
      description: "Seed, fertilizer, diesel, and transport costs. Drives operating margin sizing.",
    },
    {
      id: "yield",
      label: "Estimated Yield",
      x: 100,
      y: 220,
      value: `${expectedYield.toFixed(0)} kg`,
      status: getYieldStatus(),
      description: "Expected agricultural volume output. Highly sensitive to rainfall delays or volume anomalies.",
    },
    {
      id: "revenue",
      label: "Expected Revenue",
      x: 350,
      y: 220,
      value: `INR ${(expectedYield * expectedPrice).toFixed(0)}`,
      status: getRevenueStatus(),
      description: "Expected total revenue generated (Yield × Wholesale Price). Backs invoice liquidity bridge.",
    },
    {
      id: "cash_flow",
      label: "Net Cash Flow",
      x: 350,
      y: 360,
      value: `INR ${((expectedYield * expectedPrice) - expectedExpenses).toFixed(0)}`,
      status: getCashFlowStatus(),
      description: "Final cash remaining for debt service and operations. Status drives dynamic loan interest rate adjusting.",
    },
  ];

  const edges: Edge[] = [
    { from: "rainfall", to: "yield" },
    { from: "yield", to: "revenue" },
    { from: "price", to: "revenue" },
    { from: "revenue", to: "cash_flow" },
    { from: "cost", to: "cash_flow" },
  ];

  const getStatusColor = (status: "stable" | "watch" | "action") => {
    if (status === "action") return "var(--status-action)";
    if (status === "watch") return "var(--status-watch)";
    return "var(--status-stable)";
  };

  const getStatusLabel = (status: "stable" | "watch" | "action") => {
    if (status === "action") return "Action Required";
    if (status === "watch") return "Watch State";
    return "Stable";
  };

  const activeNode = nodes.find((n) => n.id === selectedNode);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: "1.5rem" }}>
      <div 
        className="panel" 
        style={{ 
          height: "440px", 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center",
          backgroundColor: "var(--bg-secondary)"
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 700 440" style={{ overflow: "visible" }}>
          {/* Marker definition for arrows */}
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-color)" />
            </marker>
            
            {/* Neon Glow Filter */}
            <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Render Edges */}
          {edges.map((edge, idx) => {
            const fromNode = nodes.find((n) => n.id === edge.from)!;
            const toNode = nodes.find((n) => n.id === edge.to)!;
            return (
              <line
                key={idx}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="var(--border-color)"
                strokeWidth="2"
                markerEnd="url(#arrow)"
              />
            );
          })}

          {/* Render Nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNode === node.id;
            const strokeColor = getStatusColor(node.status);
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => setSelectedNode(node.id)}
                style={{ cursor: "pointer" }}
              >
                {/* Node Box */}
                <rect
                  x="-80"
                  y="-25"
                  width="160"
                  height="50"
                  fill="var(--bg-card)"
                  stroke={isSelected ? "var(--text-primary)" : strokeColor}
                  strokeWidth={isSelected ? "2.5" : "1.5"}
                  style={{ transition: "all 0.2s" }}
                  filter={isSelected ? "url(#neon-glow)" : undefined}
                />
                {/* Status Dot */}
                <circle cx="-65" cy="0" r="4" fill={strokeColor} />
                
                {/* Node Labels */}
                <text
                  x="-50"
                  y="-5"
                  fill="var(--text-primary)"
                  fontSize="11"
                  fontWeight="600"
                  alignmentBaseline="middle"
                >
                  {node.label}
                </text>
                <text
                  x="-50"
                  y="12"
                  fill="var(--text-secondary)"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  alignmentBaseline="middle"
                >
                  {node.value}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Causal Details Sidepanel */}
      <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h4 className="panel-title">Causal Node Details</h4>
        {activeNode ? (
          <>
            <div>
              <div style={{ fontSize: "1rem", fontWeight: "600" }}>{activeNode.label}</div>
              <span 
                className="badge" 
                style={{ 
                  backgroundColor: "transparent", 
                  color: getStatusColor(activeNode.status),
                  border: `1px solid ${getStatusColor(activeNode.status)}`,
                  padding: "0.15rem 0.4rem",
                  marginTop: "0.25rem",
                  fontSize: "0.7rem"
                }}
              >
                {getStatusLabel(activeNode.status)}
              </span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
                Expected Value
              </div>
              <div style={{ fontSize: "1.125rem", fontWeight: "bold", fontFamily: "var(--font-mono)" }}>
                {activeNode.value}
              </div>
            </div>

            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
              {activeNode.description}
            </div>
          </>
        ) : (
          <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Click a graph node to inspect causal probability.
          </div>
        )}
      </div>
    </div>
  );
};
