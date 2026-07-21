import React, { useState } from "react";
import { Shield, ShieldAlert, Users, Info } from "lucide-react";

interface GraphNode {
  id: string;
  type: string;
  label: string;
  base_risk: number;
  current_risk: number;
  repayment_status: string;
  status: "stable" | "watch" | "action-required" | string;
  is_fraud_flagged: boolean;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  type: string;
}

interface NetworkGraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectEnterprise: (id: string) => void;
  selectedEnterpriseId: string;
}

export const NetworkGraphView: React.FC<NetworkGraphViewProps> = ({
  nodes,
  edges,
  onSelectEnterprise,
  selectedEnterpriseId,
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Layout node coordinates statically for clean, cluster-based aesthetics
  const nodePositions: { [key: string]: { x: number; y: number } } = {
    // Cotton Grower Group
    "SHG_COTTON_1": { x: 180, y: 180 },
    "FARMER_C1": { x: 100, y: 100 },
    "FARMER_C2": { x: 260, y: 100 },
    "FARMER_C3": { x: 180, y: 270 },
    
    // Dairy FPO Group
    "FPO_DAIRY_1": { x: 440, y: 180 },
    "FARMER_D1": { x: 370, y: 270 },
    "FARMER_D2": { x: 510, y: 270 },
    
    // Fraud Loop Cluster (tight circle)
    "FARMER_M1": { x: 620, y: 120 },
    "FARMER_M2": { x: 740, y: 120 },
    "FARMER_M3": { x: 680, y: 230 },
  };

  const getStatusColor = (node: GraphNode) => {
    if (node.is_fraud_flagged) return "var(--status-action)";
    if (node.status === "action-required" || node.current_risk > 0.6) return "var(--status-action)";
    if (node.status === "watch" || node.current_risk > 0.3) return "var(--status-watch)";
    return "var(--status-stable)";
  };

  const getEdgeStyle = (edge: GraphEdge) => {
    const isMuleLoop = 
      (edge.source === "FARMER_M1" && edge.target === "FARMER_M2") ||
      (edge.source === "FARMER_M2" && edge.target === "FARMER_M3") ||
      (edge.source === "FARMER_M3" && edge.target === "FARMER_M1");

    if (isMuleLoop) {
      return {
        stroke: "var(--status-action)",
        strokeWidth: 3.5,
        strokeDasharray: "2,2",
      };
    }

    switch (edge.type) {
      case "guarantor":
        return {
          stroke: "var(--accent-blue)",
          strokeWidth: 2,
          strokeDasharray: "4,4",
        };
      case "membership":
      case "member":
        return {
          stroke: "var(--text-muted)",
          strokeWidth: 1.5,
          strokeDasharray: "none",
        };
      default:
        return {
          stroke: "var(--border-color)",
          strokeWidth: 1.5,
          strokeDasharray: "none",
        };
    }
  };

  const getEdgeLabel = (type: string) => {
    if (type === "guarantor") return "Mutual Guarantee";
    if (type === "transaction") return "Circular Loop Inflow";
    return "Group Member";
  };

  const activeNode = nodes.find(n => n.id === hoveredNode || n.id === selectedEnterpriseId);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "1.5rem" }}>
      {/* SVG Canvas */}
      <div 
        className="panel" 
        style={{ 
          height: "460px", 
          backgroundColor: "var(--bg-secondary)", 
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ position: "absolute", top: "10px", left: "15px", display: "flex", gap: "1rem", zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.7rem", fontFamily: "var(--font-mono)" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--status-stable)" }}></span>
            Stable
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.7rem", fontFamily: "var(--font-mono)" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--status-watch)" }}></span>
            Watch
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.7rem", fontFamily: "var(--font-mono)" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--status-action)" }}></span>
            Action Required / Fraud Loop
          </div>
        </div>

        <svg width="100%" height="100%" viewBox="0 0 820 380" style={{ overflow: "visible" }}>
          {/* Arrow markers */}
          <defs>
            <marker
              id="arrow-link"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--status-action)" />
            </marker>
            
            {/* Neon Glow Filter */}
            <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Render Connections */}
          {edges.map((edge, idx) => {
            const p1 = nodePositions[edge.source];
            const p2 = nodePositions[edge.target];
            if (!p1 || !p2) return null;

            const isMuleLoop = 
              (edge.source === "FARMER_M1" && edge.target === "FARMER_M2") ||
              (edge.source === "FARMER_M2" && edge.target === "FARMER_M3") ||
              (edge.source === "FARMER_M3" && edge.target === "FARMER_M1");

            const style = getEdgeStyle(edge);

            return (
              <g key={idx}>
                <title>{getEdgeLabel(edge.type)} ({edge.source} → {edge.target})</title>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  strokeDasharray={isMuleLoop ? "6, 4" : style.strokeDasharray}
                  className={isMuleLoop ? "flow-line" : ""}
                  markerEnd={isMuleLoop ? "url(#arrow-link)" : undefined}
                  opacity={hoveredNode && hoveredNode !== edge.source && hoveredNode !== edge.target ? 0.2 : 0.85}
                  style={{ transition: "opacity 0.2s" }}
                  filter={isMuleLoop ? "url(#neon-glow)" : undefined}
                />
              </g>
            );
          })}

          {/* Render Nodes */}
          {nodes.map((node) => {
            const pos = nodePositions[node.id];
            if (!pos) return null;

            const isSelected = selectedEnterpriseId === node.id;
            const isHovered = hoveredNode === node.id;
            const color = getStatusColor(node);

            // Hide/fade other nodes on hover to isolate risk paths
            const opacity = hoveredNode && hoveredNode !== node.id ? 0.4 : 1.0;

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => onSelectEnterprise(node.id)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                opacity={opacity}
              >
                {/* Outer shadow glow if selected */}
                {isSelected && (
                  <circle r="22" fill="none" stroke={color} strokeWidth="3" strokeDasharray="3,3" opacity="0.7" className="pulse-active" />
                )}

                {/* Node Shape */}
                {node.type === "shg" || node.type === "fpo" ? (
                  <rect
                    x="-18"
                    y="-18"
                    width="36"
                    height="36"
                    fill="var(--bg-card)"
                    stroke={isSelected ? "var(--text-primary)" : color}
                    strokeWidth={isHovered || isSelected ? 2.5 : 1.5}
                    style={{ transition: "all 0.2s" }}
                    filter={isHovered || isSelected ? "url(#neon-glow)" : undefined}
                  />
                ) : (
                  <circle
                    r="16"
                    fill="var(--bg-card)"
                    stroke={isSelected ? "var(--text-primary)" : color}
                    strokeWidth={isHovered || isSelected ? 2.5 : 1.5}
                    style={{ transition: "all 0.2s" }}
                    filter={isHovered || isSelected ? "url(#neon-glow)" : undefined}
                  />
                )}

                {/* Node Inner Icon Indicator */}
                {node.is_fraud_flagged ? (
                  <text y="4" textAnchor="middle" fill={color} fontSize="11" fontWeight="bold">⚠️</text>
                ) : node.type === "shg" || node.type === "fpo" ? (
                  <text y="4" textAnchor="middle" fill={color} fontSize="10" fontWeight="bold">G</text>
                ) : null}

                {/* Node Label Text */}
                <text
                  y={node.type === "shg" || node.type === "fpo" ? 30 : 25}
                  textAnchor="middle"
                  fill="var(--text-primary)"
                  fontSize="10"
                  fontWeight={isSelected ? "bold" : "normal"}
                  fontFamily="var(--font-display)"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Details Side panel */}
      <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h4 className="panel-title">Node GNN Metadata</h4>
        {activeNode ? (
          <>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {activeNode.type === "shg" || activeNode.type === "fpo" ? (
                  <Users size={16} color="var(--accent-blue)" />
                ) : activeNode.is_fraud_flagged ? (
                  <ShieldAlert size={16} color="var(--status-action)" />
                ) : (
                  <Shield size={16} color={activeNode.current_risk > 0.4 ? "var(--status-watch)" : "var(--status-stable)"} />
                )}
                <span style={{ fontSize: "1rem", fontWeight: "bold" }}>{activeNode.label}</span>
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "0.25rem", fontFamily: "var(--font-mono)" }}>
                ID: {activeNode.id}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
              <div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>NODE TYPE</div>
                <div style={{ fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 600 }}>{activeNode.type}</div>
              </div>

              <div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>INTRINSIC BASE RISK</div>
                <div style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>{(activeNode.base_risk * 100).toFixed(0)}%</div>
              </div>

              <div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>PROPAGATED GNN PEER RISK</div>
                <div style={{ fontSize: "1.125rem", fontFamily: "var(--font-mono)", fontWeight: "bold", color: getStatusColor(activeNode) }}>
                  {(activeNode.current_risk * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              {activeNode.is_fraud_flagged ? (
                <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "0.5rem" }}>
                  <strong>ALERT:</strong> Circular transactions detected. Coordinated loop.
                </div>
              ) : activeNode.current_risk > 0.4 ? (
                <div>Risk propagated through mutual guarantees. Peers in distress.</div>
              ) : (
                <div>Secure position. Strong local indices.</div>
              )}
            </div>
          </>
        ) : (
          <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <Info size={14} />
            Hover/click nodes to trace risk.
          </div>
        )}
      </div>
    </div>
  );
};
