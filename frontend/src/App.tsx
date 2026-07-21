import { useState, useEffect } from "react";
import { 
  Shield, 
  Cpu, 
  Database, 
  RefreshCw, 
  Sliders, 
  Activity, 
  Moon, 
  Sun, 
  Smartphone, 
  CheckCircle, 
  Compass, 
  Lock, 
  BarChart2, 
  AlertTriangle
} from "lucide-react";

import { CausalGraph } from "./components/CausalGraph";
import { ForecastChart } from "./components/ForecastChart";
import { MobileSimulator } from "./components/MobileSimulator";
import { NetworkGraphView } from "./components/NetworkGraphView";

interface Enterprise {
  id: string;
  name: string;
  village_node: string;
  category: string;
  interest_rate: number;
  repayment_rate: number;
  volatility: number;
  peer_risk_score: number;
  is_fraud_flagged: boolean;
}

function App() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [selectedEntId, setSelectedEntId] = useState<string>("FARMER_C2"); // default to Sita Devi
  const [selectedEnt, setSelectedEnt] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [federatedStatus, setFederatedStatus] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [ledgerVerification, setLedgerVerification] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("portfolio");
  
  // Theme state
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("theme") as "dark" | "light") || "dark";
  });

  // Sandbox sliders state
  const [sandboxInputs, setSandboxInputs] = useState({
    rainfall_deviation_pct: 0.0,
    price_deviation_pct: 0.0,
    cost_deviation_pct: 0.0,
    rainfall_delay_weeks: 0.0,
  });

  // Sensitivity data state
  const [sensitivityData, setSensitivityData] = useState<any>(null);
  const [sensitivityVar, setSensitivityVar] = useState<string>("rainfall");

  // Compliance blacklist input state
  const [blacklistName, setBlacklistName] = useState<string>("");
  const [blacklistCategory, setBlacklistCategory] = useState<string>("sanction");
  const [blacklistMsg, setBlacklistMsg] = useState<string | null>(null);

  // Network state
  const [networkData, setNetworkData] = useState<any>(null);
  const [selectedInterventionNode, setSelectedInterventionNode] = useState<string>("FARMER_C2");
  const [selectedInterventionCode, setSelectedInterventionCode] = useState<string>("SHIFT_REPAYMENT_DATE");
  const [activeInterventions, setActiveInterventions] = useState<{ [key: string]: string }>({});

  // Market & Weather feeds state
  const [marketFeed, setMarketFeed] = useState<any>(null);

  // VC Verifier state
  const [vcInputText, setVcInputText] = useState<string>("");
  const [vcVerificationResult, setVcVerificationResult] = useState<any>(null);

  // Sync theme attribute with document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Fetch initial portfolio
  const fetchPortfolio = () => {
    fetch("http://127.0.0.1:8000/api/enterprises")
      .then((res) => res.json())
      .then((data) => {
        setEnterprises(data);
        const active = data.find((e: Enterprise) => e.id === selectedEntId);
        if (active) setSelectedEnt(active);
      })
      .catch((err) => console.error("Error fetching portfolio:", err));
  };

  // Fetch audit logs
  const fetchAuditLogs = () => {
    fetch("http://127.0.0.1:8000/api/audit/ledger")
      .then((res) => res.json())
      .then((data) => setAuditLogs(data))
      .catch((err) => console.error("Error fetching audit logs:", err));
  };

  // Fetch federated status
  const fetchFederatedStatus = () => {
    fetch("http://127.0.0.1:8000/api/federated/status")
      .then((res) => res.json())
      .then((data) => setFederatedStatus(data))
      .catch((err) => console.error("Error fetching federated status:", err));
  };

  // Fetch GNN network graph
  const fetchNetworkGraph = () => {
    fetch("http://127.0.0.1:8000/api/network/state")
      .then((res) => res.json())
      .then((data) => setNetworkData(data))
      .catch((err) => console.error("Error fetching network graph:", err));
  };

  // Fetch sensitivity data
  const fetchSensitivity = (entId: string) => {
    fetch(`http://127.0.0.1:8000/api/enterprises/${entId}/sensitivity`)
      .then((res) => res.json())
      .then((data) => setSensitivityData(data))
      .catch((err) => console.error(err));
  };

  // Fetch historical commodity prices / weather
  const fetchMarketFeed = () => {
    fetch("http://127.0.0.1:8000/api/market/feeds")
      .then((res) => res.json())
      .then((data) => setMarketFeed(data))
      .catch((err) => console.error(err));
  };

  // Fetch forecast and compliance for selected enterprise
  const updateSelectedData = () => {
    if (!selectedEntId) return;

    fetch(`http://127.0.0.1:8000/api/enterprises/${selectedEntId}`)
      .then((res) => res.json())
      .then((data) => setSelectedEnt(data))
      .catch((err) => console.error(err));

    fetch(`http://127.0.0.1:8000/api/enterprises/${selectedEntId}/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sandboxInputs),
    })
      .then((res) => res.json())
      .then((data) => setForecast(data))
      .catch((err) => console.error(err));

    fetch(`http://127.0.0.1:8000/api/compliance/scan/${selectedEntId}`)
      .then((res) => res.json())
      .then((data) => setCompliance(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchPortfolio();
    fetchAuditLogs();
    fetchFederatedStatus();
    fetchNetworkGraph();
    fetchMarketFeed();
  }, []);

  // Update whenever selected enterprise changes
  useEffect(() => {
    setSandboxInputs({
      rainfall_deviation_pct: 0.0,
      price_deviation_pct: 0.0,
      cost_deviation_pct: 0.0,
      rainfall_delay_weeks: 0.0,
    });
    fetchSensitivity(selectedEntId);
  }, [selectedEntId]);

  useEffect(() => {
    updateSelectedData();
  }, [selectedEntId, sandboxInputs]);

  // Run next round of federated learning
  const triggerFederatedRound = () => {
    setLoading(true);
    fetch("http://127.0.0.1:8000/api/federated/round", { method: "POST" })
      .then((res) => res.json())
      .then(() => {
        fetchFederatedStatus();
        fetchAuditLogs();
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // Verify cryptographic audit ledger
  const triggerAuditVerification = () => {
    fetch("http://127.0.0.1:8000/api/audit/verify")
      .then((res) => res.json())
      .then((data) => {
        setLedgerVerification(data.message);
        setTimeout(() => setLedgerVerification(null), 4000);
      })
      .catch(() => setLedgerVerification("Verification failed. Server connection error."));
  };

  // Register blacklisted entity
  const handleAddBlacklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blacklistName.trim()) return;

    fetch("http://127.0.0.1:8000/api/compliance/add-blacklisted", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: blacklistName, category: blacklistCategory }),
    })
      .then((res) => res.json())
      .then((data) => {
        setBlacklistMsg(data.message);
        setBlacklistName("");
        fetchAuditLogs();
        updateSelectedData();
        fetchPortfolio();
        fetchNetworkGraph();
        setTimeout(() => setBlacklistMsg(null), 4000);
      })
      .catch(() => setBlacklistMsg("Failed to add blacklisted entity."));
  };

  // Reset compliance registries
  const handleResetCompliance = () => {
    fetch("http://127.0.0.1:8000/api/compliance/reset", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        setBlacklistMsg(data.message);
        fetchAuditLogs();
        updateSelectedData();
        fetchPortfolio();
        fetchNetworkGraph();
        setTimeout(() => setBlacklistMsg(null), 4000);
      })
      .catch(() => setBlacklistMsg("Failed to reset registries."));
  };

  // Apply dynamic GNN risk intervention
  const handleApplyIntervention = (e: React.FormEvent) => {
    e.preventDefault();

    fetch("http://127.0.0.1:8000/api/network/intervene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ node_id: selectedInterventionNode, action_code: selectedInterventionCode })
    })
      .then((res) => res.json())
      .then((data) => {
        setNetworkData(data);
        setActiveInterventions(prev => {
          const next = { ...prev };
          if (selectedInterventionCode === "CLEAR") {
            delete next[selectedInterventionNode];
          } else {
            next[selectedInterventionNode] = selectedInterventionCode;
          }
          return next;
        });
        fetchAuditLogs();
        fetchPortfolio();
      })
      .catch((err) => console.error(err));
  };

  // Cryptographic VC Verifier submission
  const handleVerifyVC = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vcInputText.trim()) return;

    try {
      const parsed = JSON.parse(vcInputText);
      fetch("http://127.0.0.1:8000/api/credential/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed)
      })
        .then((res) => res.json())
        .then((data) => setVcVerificationResult(data))
        .catch(() => setVcVerificationResult({ is_valid: false, message: "Server connection failed during verification check." }));
    } catch (err) {
      setVcVerificationResult({
        is_valid: false,
        message: "JSON Syntax Error: Paste a W3C compliant JSON Verifiable Credential structure."
      });
    }
  };

  // Load Sita Devi VC for testing
  const handleLoadDemoVC = () => {
    fetch(`http://127.0.0.1:8000/api/enterprises/FARMER_C2/credential`)
      .then((res) => res.json())
      .then((data) => {
        setVcInputText(JSON.stringify(data, null, 2));
        setVcVerificationResult(null);
      })
      .catch(() => {});
  };

  // Trigger rapid climate/market shocks for sandbox testing
  const triggerSimulationShock = (type: string) => {
    if (type === "drought") {
      setSandboxInputs({
        rainfall_deviation_pct: -45.0,
        rainfall_delay_weeks: 3.5,
        price_deviation_pct: 0.0,
        cost_deviation_pct: 12.0
      });
    } else if (type === "crash") {
      setSandboxInputs({
        rainfall_deviation_pct: 5.0,
        rainfall_delay_weeks: 0.0,
        price_deviation_pct: -35.0,
        cost_deviation_pct: -5.0
      });
    } else if (type === "costs") {
      setSandboxInputs({
        rainfall_deviation_pct: 0.0,
        rainfall_delay_weeks: 0.0,
        price_deviation_pct: 10.0,
        cost_deviation_pct: 38.0
      });
    }
    setActiveTab("sandbox");
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === "action-required") return "badge badge-action";
    if (status === "watch") return "badge badge-watch";
    return "badge badge-stable";
  };

  const getStatusColor = (status: string) => {
    if (status === "action-required") return "var(--status-action)";
    if (status === "watch") return "var(--status-watch)";
    return "var(--status-stable)";
  };

  // Draw Causal Sensitivity Curve
  const renderSensitivityPlot = () => {
    if (!sensitivityData) return <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Loading stress sweeps...</div>;

    let points: Array<{ xVal: number; yVal: number }> = [];
    let xLabel = "";
    let xMin = 0;
    let xMax = 100;

    if (sensitivityVar === "rainfall") {
      points = sensitivityData.rainfall_sweep.map((d: any) => ({ xVal: d.deviation, yVal: d.median_cash_flow }));
      xLabel = "Rainfall Deviation (%)";
      xMin = -50;
      xMax = 50;
    } else if (sensitivityVar === "price") {
      points = sensitivityData.price_sweep.map((d: any) => ({ xVal: d.deviation, yVal: d.median_cash_flow }));
      xLabel = "Wholesale Price Deviation (%)";
      xMin = -40;
      xMax = 40;
    } else if (sensitivityVar === "cost") {
      points = sensitivityData.cost_sweep.map((d: any) => ({ xVal: d.deviation, yVal: d.median_cash_flow }));
      xLabel = "Operational Cost Deviation (%)";
      xMin = -20;
      xMax = 40;
    } else if (sensitivityVar === "delay") {
      points = sensitivityData.delay_sweep.map((d: any) => ({ xVal: d.weeks, yVal: d.median_cash_flow }));
      xLabel = "Monsoon Sowing Delay (Weeks)";
      xMin = 0;
      xMax = 6;
    }

    if (points.length === 0) return null;

    const w = 550;
    const h = 220;
    const px = 55;
    const py = 30;

    const yVals = points.map(p => p.yVal);
    const yMax = Math.max(...yVals, selectedEnt?.loan_repayment_monthly || 8000) * 1.2;
    const yMin = Math.min(...yVals, 0) * 1.2;

    const scaleX = (val: number) => px + ((val - xMin) / (xMax - xMin)) * (w - 2 * px);
    const scaleY = (val: number) => h - py - ((val - yMin) / (yMax - yMin)) * (h - 2 * py);

    const pathData = `M ${points.map(p => `${scaleX(p.xVal)},${scaleY(p.yVal)}`).join(" L ")}`;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
            SWEEP SENSITIVITY ANALYTICS
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {["rainfall", "price", "cost", "delay"].map(v => (
              <button
                key={v}
                className="badge btn-outline"
                style={{ 
                  textTransform: "uppercase", 
                  fontSize: "0.65rem",
                  borderColor: sensitivityVar === v ? "var(--accent-blue)" : "var(--border-color)",
                  color: sensitivityVar === v ? "var(--text-primary)" : "var(--text-muted)"
                }}
                onClick={() => setSensitivityVar(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div style={{ position: "relative", width: "100%", height: `${h}px` }}>
          <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const val = yMin + ratio * (yMax - yMin);
              const y = scaleY(val);
              return (
                <g key={idx}>
                  <line x1={px} y1={y} x2={w - px} y2={y} stroke="var(--border-color)" strokeDasharray="3,3" />
                  <text
                    x={px - 8}
                    y={y}
                    fill="var(--text-muted)"
                    fontSize="8"
                    fontFamily="var(--font-mono)"
                    textAnchor="end"
                    alignmentBaseline="middle"
                  >
                    INR {val.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {/* Threshold Repayment Target Line */}
            {selectedEnt && (
              <g>
                <line 
                  x1={px} 
                  y1={scaleY(forecast?.loan_repayment_monthly || 8000)} 
                  x2={w - px} 
                  y2={scaleY(forecast?.loan_repayment_monthly || 8000)} 
                  stroke="var(--status-watch)" 
                  strokeWidth="1.5" 
                  strokeDasharray="4,4" 
                />
                <text 
                  x={w - px - 5} 
                  y={scaleY(forecast?.loan_repayment_monthly || 8000) - 5} 
                  fill="var(--status-watch)" 
                  fontSize="8" 
                  fontFamily="var(--font-mono)" 
                  textAnchor="end"
                >
                  Repayment Limit (INR {forecast?.loan_repayment_monthly || 8000})
                </text>
              </g>
            )}

            {/* Sweep Curve Path */}
            <path d={pathData} fill="none" stroke="var(--accent-blue)" strokeWidth="2.5" />

            {/* Data Dots */}
            {points.map((p, idx) => {
              const cx = scaleX(p.xVal);
              const cy = scaleY(p.yVal);
              const isBelow = p.yVal < (selectedEnt?.loan_repayment_monthly || 8000);
              return (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r="4"
                  fill={isBelow ? "var(--status-action)" : "var(--status-stable)"}
                  stroke="var(--bg-card)"
                  strokeWidth="1"
                />
              );
            })}

            {/* X-Axis labels */}
            {points.map((p, idx) => {
              if (idx % 2 !== 0 && idx !== points.length - 1) return null; // reduce label density
              return (
                <g key={idx}>
                  <line x1={scaleX(p.xVal)} y1={h - py} x2={scaleX(p.xVal)} y2={h - py + 4} stroke="var(--border-color)" />
                  <text
                    x={scaleX(p.xVal)}
                    y={h - py + 14}
                    fill="var(--text-muted)"
                    fontSize="8"
                    fontFamily="var(--font-mono)"
                    textAnchor="middle"
                  >
                    {p.xVal}
                  </text>
                </g>
              );
            })}

            {/* Axis Labels */}
            <text x={w / 2} y={h - 2} fill="var(--text-muted)" fontSize="9" textAnchor="middle" fontFamily="var(--font-mono)">
              {xLabel}
            </text>
          </svg>
        </div>
      </div>
    );
  };

  // Draw Federated Learning Loss curve
  const renderFederatedLossCurve = () => {
    if (!federatedStatus || !federatedStatus.history || federatedStatus.history.length === 0) {
      return <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No round history. Trigger rounds to plot convergence.</div>;
    }

    const history = federatedStatus.history;
    const w = 360;
    const h = 180;
    const px = 40;
    const py = 25;

    const maxRound = Math.max(5, history.length);
    const maxLoss = 0.6;
    const minLoss = 0.0;

    const scaleX = (r: number) => px + ((r - 1) / (maxRound - 1)) * (w - 2 * px);
    const scaleY = (loss: number) => h - py - ((loss - minLoss) / (maxLoss - minLoss)) * (h - 2 * py);

    const pathData = `M ${history.map((hObj: any) => `${scaleX(hObj.round)},${scaleY(hObj.training_loss)}`).join(" L ")}`;

    return (
      <div style={{ position: "relative", width: "100%", height: `${h}px` }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
          {/* Horizontal lines */}
          {[0, 0.5, 1].map((ratio, idx) => {
            const val = minLoss + ratio * (maxLoss - minLoss);
            const y = scaleY(val);
            return (
              <g key={idx}>
                <line x1={px} y1={y} x2={w - px} y2={y} stroke="var(--border-color)" strokeDasharray="3,3" />
                <text x={px - 5} y={y} fill="var(--text-muted)" fontSize="8" fontFamily="var(--font-mono)" textAnchor="end" alignmentBaseline="middle">
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Loss Curve */}
          <path d={pathData} fill="none" stroke="var(--accent-teal)" strokeWidth="2.5" />

          {/* Points */}
          {history.map((hObj: any, idx: number) => (
            <circle
              key={idx}
              cx={scaleX(hObj.round)}
              cy={scaleY(hObj.training_loss)}
              r="3.5"
              fill="var(--accent-teal)"
              stroke="var(--bg-card)"
              strokeWidth="1"
            />
          ))}

          {/* Bottom Round Labels */}
          {history.map((hObj: any, idx: number) => (
            <text
              key={idx}
              x={scaleX(hObj.round)}
              y={h - py + 12}
              fill="var(--text-muted)"
              fontSize="8"
              fontFamily="var(--font-mono)"
              textAnchor="middle"
            >
              R{hObj.round}
            </text>
          ))}

          <text x={w / 2} y={h - 2} fill="var(--text-muted)" fontSize="9" textAnchor="middle" fontFamily="var(--font-mono)">
            Federated Aggregation Rounds
          </text>
        </svg>
      </div>
    );
  };

  // Draw Market Feed line chart
  const renderMarketFeedChart = (type: "weather" | "commodities") => {
    if (!marketFeed) return <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Loading feeds...</div>;

    const w = 550;
    const h = 200;
    const px = 45;
    const py = 25;

    const scaleX = (idx: number) => px + (idx / 29) * (w - 2 * px);

    if (type === "weather") {
      const data = marketFeed.rainfall_feed;
      const minV = Math.min(...data) - 5;
      const maxV = Math.max(...data) + 5;
      const scaleY = (val: number) => h - py - ((val - minV) / (maxV - minV)) * (h - 2 * py);

      const pathData = `M ${data.map((v: number, idx: number) => `${scaleX(idx)},${scaleY(v)}`).join(" L ")}`;

      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
          {[0, 0.5, 1].map((ratio, idx) => {
            const val = minV + ratio * (maxV - minV);
            const y = scaleY(val);
            return (
              <g key={idx}>
                <line x1={px} y1={y} x2={w - px} y2={y} stroke="var(--border-color)" strokeDasharray="3,3" />
                <text x={px - 5} y={y} fill="var(--text-muted)" fontSize="8" fontFamily="var(--font-mono)" textAnchor="end" alignmentBaseline="middle">
                  {val.toFixed(1)}%
                </text>
              </g>
            );
          })}
          <path d={pathData} fill="none" stroke="var(--accent-blue)" strokeWidth="2" />
          <text x={w / 2} y={h - 2} fill="var(--text-muted)" fontSize="9" textAnchor="middle" fontFamily="var(--font-mono)">
            Past 30 Days Weather Index (Monsoon Deviation)
          </text>
        </svg>
      );
    } else {
      const cotton = marketFeed.prices.cotton;
      const dairy = marketFeed.prices.dairy;
      const rice = marketFeed.prices.rice;

      const all = [...cotton, ...dairy, ...rice];
      const minV = Math.min(...all) - 5;
      const maxV = Math.max(...all) + 5;
      const scaleY = (val: number) => h - py - ((val - minV) / (maxV - minV)) * (h - 2 * py);

      const pathCotton = `M ${cotton.map((v: number, idx: number) => `${scaleX(idx)},${scaleY(v)}`).join(" L ")}`;
      const pathDairy = `M ${dairy.map((v: number, idx: number) => `${scaleX(idx)},${scaleY(v)}`).join(" L ")}`;
      const pathRice = `M ${rice.map((v: number, idx: number) => `${scaleX(idx)},${scaleY(v)}`).join(" L ")}`;

      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
          {[0, 0.5, 1].map((ratio, idx) => {
            const val = minV + ratio * (maxV - minV);
            const y = scaleY(val);
            return (
              <g key={idx}>
                <line x1={px} y1={y} x2={w - px} y2={y} stroke="var(--border-color)" strokeDasharray="3,3" />
                <text x={px - 5} y={y} fill="var(--text-muted)" fontSize="8" fontFamily="var(--font-mono)" textAnchor="end" alignmentBaseline="middle">
                  INR {val.toFixed(0)}
                </text>
              </g>
            );
          })}
          <path d={pathCotton} fill="none" stroke="var(--accent-purple)" strokeWidth="2" />
          <path d={pathDairy} fill="none" stroke="var(--status-stable)" strokeWidth="2" />
          <path d={pathRice} fill="none" stroke="var(--status-watch)" strokeWidth="2" />
          <text x={w / 2} y={h - 2} fill="var(--text-muted)" fontSize="9" textAnchor="middle" fontFamily="var(--font-mono)">
            Commodity Wholesale Spot Prices (INR/kg or Liter)
          </text>
        </svg>
      );
    }
  };

  // Top KPIs calculations
  const totalExposure = enterprises.length * 40000; // mock aggregate exposure
  const averageLendingRate = enterprises.length > 0 
    ? enterprises.reduce((acc, ent) => acc + ent.interest_rate, 0) / enterprises.length 
    : 11.2;
  const avgRiskIndex = enterprises.length > 0
    ? enterprises.reduce((acc, ent) => acc + ent.peer_risk_score, 0) / enterprises.length
    : 0.35;
  const fraudRingsCount = networkData?.fraud_rings?.length || 1;
  const activeAlerts = enterprises.filter(ent => ent.peer_risk_score > 0.5 || ent.is_fraud_flagged).length;

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          {/* Title Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem" }}>
            <Cpu size={24} color="var(--accent-blue)" />
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>
                TPR-MATRIX
              </h2>
              <span style={{ fontSize: "0.55rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                STOCHASTIC INFERENCE
              </span>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="sidebar-menu">
            <button 
              className={`sidebar-item ${activeTab === "portfolio" ? "active" : ""}`}
              onClick={() => setActiveTab("portfolio")}
            >
              <Activity size={16} />
              Portfolio Overview
            </button>
            <button 
              className={`sidebar-item ${activeTab === "sandbox" ? "active" : ""}`}
              onClick={() => setActiveTab("sandbox")}
            >
              <Sliders size={16} />
              Causal Sandbox
            </button>
            <button 
              className={`sidebar-item ${activeTab === "network" ? "active" : ""}`}
              onClick={() => setActiveTab("network")}
            >
              <Compass size={16} />
              Network GNN & Mitigations
            </button>
            <button 
              className={`sidebar-item ${activeTab === "market" ? "active" : ""}`}
              onClick={() => setActiveTab("market")}
            >
              <BarChart2 size={16} />
              Climate & Market Feeds
            </button>
            <button 
              className={`sidebar-item ${activeTab === "vc-verifier" ? "active" : ""}`}
              onClick={() => setActiveTab("vc-verifier")}
            >
              <Lock size={16} />
              VC Cryptographic Verifier
            </button>
            <button 
              className={`sidebar-item ${activeTab === "compliance" ? "active" : ""}`}
              onClick={() => setActiveTab("compliance")}
            >
              <Shield size={16} />
              PEP & AML Hub
            </button>
            <button 
              className={`sidebar-item ${activeTab === "federated" ? "active" : ""}`}
              onClick={() => setActiveTab("federated")}
            >
              <Cpu size={16} />
              DP Federated Learning
            </button>
            <button 
              className={`sidebar-item ${activeTab === "ledger" ? "active" : ""}`}
              onClick={() => setActiveTab("ledger")}
            >
              <Database size={16} />
              Cryptographic Ledger
            </button>
            <button 
              className={`sidebar-item ${activeTab === "simulator" ? "active" : ""}`}
              onClick={() => setActiveTab("simulator")}
            >
              <Smartphone size={16} />
              Farmer Client App
            </button>
          </nav>
        </div>

        {/* Footer controls & theme switch */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-display)" }}>Theme Mode</span>
            <button 
              className="theme-toggle-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle Light/Dark Theme"
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
          <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            TPR-MATRIX CORE v1.3.0
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="workspace-wrapper">
        <header 
          style={{ 
            padding: "1rem 1.5rem", 
            borderBottom: "1px solid var(--border-color)", 
            backgroundColor: "var(--bg-secondary)", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            transition: "background-color var(--transition-speed) ease, border-color var(--transition-speed) ease"
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.125rem", fontWeight: "bold" }}>
              {activeTab === "portfolio" && "REGIONAL PORTFOLIO EXPOSURE"}
              {activeTab === "sandbox" && "CAUSAL RISK SIMULATOR"}
              {activeTab === "network" && "GNN PEER RISK INTERVENTIONS"}
              {activeTab === "market" && "WEATHER INDEX & COMMODITY DATA FEEDS"}
              {activeTab === "vc-verifier" && "W3C VERIFIABLE CREDENTIALS CRYPTOGRAPHIC VALIDATOR"}
              {activeTab === "compliance" && "DECOUPLED AML & PEP SEARCH AGENT"}
              {activeTab === "federated" && "DIFFERENTIAL PRIVACY LEARNING"}
              {activeTab === "ledger" && "TAMPER-PROOF LEDGER AUDITOR"}
              {activeTab === "simulator" && "ENTREPRENEUR SANDBOX VIEWPORT"}
            </h1>
            <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Topological Peer-Risk Propagation Matrix & Decentralized Parametric Stress Sweep Inference Platform
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button 
              className="badge btn-outline" 
              onClick={() => { fetchPortfolio(); fetchAuditLogs(); fetchFederatedStatus(); fetchNetworkGraph(); }} 
              style={{ cursor: "pointer" }}
            >
              <RefreshCw size={11} style={{ marginRight: "4px" }} />
              Sync API Nodes
            </button>
          </div>
        </header>

        {/* Dynamic Screens */}
        <main className="workspace-content">
          
          {/* TAB 1: Portfolio View */}
          {activeTab === "portfolio" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              
              {/* Premium Top KPIs Widgets */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem" }}>
                <div className="panel" style={{ padding: "1rem" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>PORTFOLIO EXPOSURE</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: "bold", marginTop: "0.25rem", fontFamily: "var(--font-mono)" }}>
                    INR {(totalExposure/100000).toFixed(2)} Lakh
                  </div>
                </div>
                <div className="panel" style={{ padding: "1rem" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>AVERAGE INTEREST</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: "bold", marginTop: "0.25rem", fontFamily: "var(--font-mono)", color: "var(--accent-blue)" }}>
                    {averageLendingRate.toFixed(2)}%
                  </div>
                </div>
                <div className="panel" style={{ padding: "1rem" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>GNN AVG PEER RISK</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: "bold", marginTop: "0.25rem", fontFamily: "var(--font-mono)", color: avgRiskIndex > 0.4 ? "var(--status-watch)" : "var(--status-stable)" }}>
                    {avgRiskIndex.toFixed(3)}
                  </div>
                </div>
                <div className="panel" style={{ padding: "1rem" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>FRAUD LOOP ANOMALIES</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: "bold", marginTop: "0.25rem", fontFamily: "var(--font-mono)", color: fraudRingsCount > 0 ? "var(--status-action)" : "inherit" }}>
                    {fraudRingsCount} Detect
                  </div>
                </div>
                <div className="panel" style={{ padding: "1rem" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>ACTIVE ALERTS RISK</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: "bold", marginTop: "0.25rem", fontFamily: "var(--font-mono)", color: activeAlerts > 0 ? "var(--status-action)" : "inherit" }}>
                    {activeAlerts} Nodes
                  </div>
                </div>
              </div>

              {/* Exposure list grid */}
              <div className="panel">
                <div className="panel-header">
                  <h3 className="panel-title">Active Portfolio Risk Index</h3>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    Regional Credit Exposure List
                  </span>
                </div>
                
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Enterprise ID</th>
                        <th>Name</th>
                        <th>Village Node</th>
                        <th>Sector</th>
                        <th>Lending Rate</th>
                        <th>Repayment consistency</th>
                        <th>Volatility Index</th>
                        <th>Propagated Peer Risk</th>
                        <th>Circular Loop Alert</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enterprises.map((ent) => {
                        const isSelected = ent.id === selectedEntId;
                        return (
                          <tr 
                            key={ent.id} 
                            onClick={() => setSelectedEntId(ent.id)}
                            style={{ 
                              cursor: "pointer",
                              backgroundColor: isSelected ? "rgba(59, 130, 246, 0.05)" : "transparent",
                              fontWeight: isSelected ? "bold" : "normal"
                            }}
                          >
                            <td className="mono-digits">{ent.id}</td>
                            <td>{ent.name}</td>
                            <td>{ent.village_node}</td>
                            <td style={{ textTransform: "uppercase", fontSize: "0.75rem" }}>{ent.category}</td>
                            <td className="mono-digits">{ent.interest_rate}%</td>
                            <td className="mono-digits">{(ent.repayment_rate * 100).toFixed(0)}%</td>
                            <td className="mono-digits">{ent.volatility.toFixed(2)}</td>
                            <td className="mono-digits" style={{ color: ent.peer_risk_score > 0.4 ? "var(--status-action)" : "inherit", fontWeight: "bold" }}>
                              {ent.peer_risk_score}
                            </td>
                            <td>
                              {ent.is_fraud_flagged ? (
                                <span className="badge badge-action">Loop Flagged</span>
                              ) : (
                                <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Clear</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedEnt && (
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
                  <div className="panel" style={{ borderLeft: `4px solid ${getStatusColor(forecast?.status)}` }}>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      EXPOSURE RISK SYNOPSIS
                    </div>
                    <h3 style={{ fontSize: "1.2rem", marginTop: "0.25rem" }}>{selectedEnt.name}</h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      Sector: {selectedEnt.category.toUpperCase()} | Node: {selectedEnt.village_node} | Repayment target: INR {forecast?.loan_repayment_monthly || 8000}/mo
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-color)" }}>
                      <div>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Current Forecast Status</div>
                        <span className={getStatusBadgeClass(forecast?.status)} style={{ marginTop: "0.25rem" }}>
                          {forecast?.status || "Stable"}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Dynamic Adjusted Interest</div>
                        <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--accent-blue)", fontFamily: "var(--font-mono)" }}>
                          {forecast?.dynamic_interest_rate || selectedEnt.interest_rate}%
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="panel">
                    <div className="panel-header">
                      <h3 className="panel-title">Immediate Mitigation</h3>
                    </div>
                    {forecast?.recommended_action ? (
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: getStatusColor(forecast.status) }}>
                          {forecast.recommended_action.title}
                        </div>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.35rem" }}>
                          {forecast.recommended_action.description}
                        </p>
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>No immediate action required. Entity stable.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Sandbox View */}
          {activeTab === "sandbox" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "1.5rem" }}>
                {/* Visual Causal Graph */}
                <div className="panel">
                  <div className="panel-header">
                    <h3 className="panel-title">Explainable Causal Influence Graph</h3>
                  </div>
                  <CausalGraph 
                    expectedYield={forecast?.expected_yield_kg || (selectedEnt?.repayment_rate ? selectedEnt.repayment_rate * 1000 : 800)}
                    expectedPrice={forecast?.expected_price_per_kg || 40}
                    expectedExpenses={forecast?.expected_expenses || 30000}
                    forecastStatus={forecast?.status || "stable"}
                    sandboxInputs={sandboxInputs}
                  />
                </div>

                {/* Slider Panel representing parameters */}
                <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                  <div className="panel-header">
                    <h3 className="panel-title">Stress Simulation Inputs</h3>
                  </div>

                  <div className="slider-container">
                    <div className="slider-header">
                      <span>Monsoon Rainfall deviation</span>
                      <span>{sandboxInputs.rainfall_deviation_pct}%</span>
                    </div>
                    <input 
                      type="range" min="-50" max="50" 
                      value={sandboxInputs.rainfall_deviation_pct} 
                      onChange={(e) => setSandboxInputs(prev => ({ ...prev, rainfall_deviation_pct: Number(e.target.value) }))}
                      className="slider-input" 
                    />
                  </div>

                  <div className="slider-container">
                    <div className="slider-header">
                      <span>Monsoon Sowing Delay</span>
                      <span>{sandboxInputs.rainfall_delay_weeks} Weeks</span>
                    </div>
                    <input 
                      type="range" min="0" max="6" 
                      value={sandboxInputs.rainfall_delay_weeks} 
                      onChange={(e) => setSandboxInputs(prev => ({ ...prev, rainfall_delay_weeks: Number(e.target.value) }))}
                      className="slider-input" 
                    />
                  </div>

                  <div className="slider-container">
                    <div className="slider-header">
                      <span>Wholesale Spot Price deviation</span>
                      <span>{sandboxInputs.price_deviation_pct}%</span>
                    </div>
                    <input 
                      type="range" min="-40" max="40" 
                      value={sandboxInputs.price_deviation_pct} 
                      onChange={(e) => setSandboxInputs(prev => ({ ...prev, price_deviation_pct: Number(e.target.value) }))}
                      className="slider-input" 
                    />
                  </div>

                  <div className="slider-container">
                    <div className="slider-header">
                      <span>Operating Cost deviation</span>
                      <span>{sandboxInputs.cost_deviation_pct}%</span>
                    </div>
                    <input 
                      type="range" min="-20" max="40" 
                      value={sandboxInputs.cost_deviation_pct} 
                      onChange={(e) => setSandboxInputs(prev => ({ ...prev, cost_deviation_pct: Number(e.target.value) }))}
                      className="slider-input" 
                    />
                  </div>

                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    Sliders model dynamic weather/market shifts impacting cash flows.
                  </div>
                </div>
              </div>

              {/* Shaded confidence chart and Sensitivity curve */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
                {forecast?.monthly_projections && (
                  <ForecastChart projections={forecast.monthly_projections} />
                )}

                <div className="panel">
                  {renderSensitivityPlot()}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Network View with GNN Intervention Playground */}
          {activeTab === "network" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className="panel">
                <div className="panel-header">
                  <h3 className="panel-title">Regional Guarantee & Transaction Network</h3>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    GNN Message Passing Loop Visualizer
                  </span>
                </div>
                {networkData ? (
                  <NetworkGraphView 
                    nodes={networkData.nodes}
                    edges={networkData.edges}
                    onSelectEnterprise={(id) => setSelectedEntId(id)}
                    selectedEnterpriseId={selectedEntId}
                  />
                ) : (
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Loading network graph data...</div>
                )}
              </div>

              {/* Intervention Playground Panel */}
              <div className="panel" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
                <div>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: "bold" }}>GNN Peer Risk Mitigation Sandbox</h4>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                    Select an enterprise and apply a dynamic structural intervention to observe how GNN peer risk scores re-propagate and reduce risk across guarantor neighbors.
                  </p>

                  <form onSubmit={handleApplyIntervention} style={{ display: "flex", gap: "1rem", marginTop: "1rem", alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>CHOOSE TARGET NODE</label>
                      <select 
                        className="form-control" 
                        value={selectedInterventionNode}
                        onChange={(e) => setSelectedInterventionNode(e.target.value)}
                        style={{ marginTop: "0.25rem" }}
                      >
                        {enterprises.map(ent => (
                          <option key={ent.id} value={ent.id}>{ent.name} ({ent.id})</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ flex: 1.2 }}>
                      <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>CHOOSE INTERVENTION ACTION</label>
                      <select 
                        className="form-control" 
                        value={selectedInterventionCode}
                        onChange={(e) => setSelectedInterventionCode(e.target.value)}
                        style={{ marginTop: "0.25rem" }}
                      >
                        <option value="SHIFT_REPAYMENT_DATE">Flexible Repayment Extension (Defer 30d)</option>
                        <option value="RECEIVABLES_BRIDGE_LOAN">Purchase-Order Backed Bridge Loan (INR 1 Lakh)</option>
                        <option value="BUFFER_OPTIMIZE">Optimize SHG Liquidity Buffer (+5% contribution)</option>
                        <option value="GROWTH_NUDGE">Pre-Approved Capital Credit Expansion</option>
                        <option value="CLEAR">Clear Interventions (Restore Defaults)</option>
                      </select>
                    </div>

                    <button type="submit" className="btn-primary" style={{ padding: "0.45rem 1rem" }}>
                      Apply Mitigation
                    </button>
                  </form>
                </div>

                <div style={{ backgroundColor: "var(--bg-secondary)", padding: "1rem", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>ACTIVE MITIGATION INTERVENTIONS</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                    {Object.keys(activeInterventions).length > 0 ? (
                      Object.entries(activeInterventions).map(([nid, action]) => {
                        const ent = enterprises.find(e => e.id === nid);
                        return (
                          <div key={nid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                            <span style={{ fontWeight: 600 }}>{ent?.name || nid}</span>
                            <span className="badge badge-blue" style={{ fontSize: "0.65rem" }}>{action.replace(/_/g, " ")}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>No active interventions. Select 'Sita Devi (Cotton)' and apply Deferment to trace propagated reductions.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Market and Climate Intelligence Feeds */}
          {activeTab === "market" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Event triggers alerts */}
              <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: "bold" }}>Parametric Climate & Price Shock Triggers</h4>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                    Simulate a regional disaster shock to instantly evaluate GNN risk propagation and parametric insurance eligibility.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button className="badge badge-action btn-outline" style={{ cursor: "pointer", border: "1px solid var(--status-action)" }} onClick={() => triggerSimulationShock("drought")}>
                    ⚠️ Drought Shock Event
                  </button>
                  <button className="badge badge-watch btn-outline" style={{ cursor: "pointer", border: "1px solid var(--status-watch)" }} onClick={() => triggerSimulationShock("crash")}>
                    📉 Spot Wholesale Crash
                  </button>
                  <button className="badge badge-blue btn-outline" style={{ cursor: "pointer", border: "1px solid var(--accent-blue)" }} onClick={() => triggerSimulationShock("costs")}>
                    📈 Operating Cost Spike
                  </button>
                </div>
              </div>

              {/* Feed Charts */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <div className="panel">
                  <div className="panel-header">
                    <h3 className="panel-title">Weather Feed (Historical Deviation)</h3>
                  </div>
                  <div style={{ height: "200px" }}>
                    {renderMarketFeedChart("weather")}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <h3 className="panel-title">Commodity Feeds Spot Prices</h3>
                  </div>
                  <div style={{ height: "200px" }}>
                    {renderMarketFeedChart("commodities")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: VC Cryptographic Verifier Portal */}
          {activeTab === "vc-verifier" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "1.5rem" }}>
              <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="panel-header">
                  <h3 className="panel-title">Verification Terminal</h3>
                  <button className="badge badge-blue" style={{ cursor: "pointer", background: "none" }} onClick={handleLoadDemoVC}>
                    Load Sita Devi VC
                  </button>
                </div>

                <form onSubmit={handleVerifyVC} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                      PASTE VC JSON STRUCTURE
                    </label>
                    <textarea
                      className="form-control"
                      rows={14}
                      value={vcInputText}
                      onChange={(e) => setVcInputText(e.target.value)}
                      placeholder='Paste JSON W3C Verifiable Credential here...'
                      style={{ marginTop: "0.25rem", fontFamily: "var(--font-mono)", fontSize: "0.7rem", resize: "none" }}
                    />
                  </div>

                  <button type="submit" className="btn-primary" style={{ padding: "0.6rem" }}>
                    Validate Cryptographic Signature
                  </button>
                </form>
              </div>

              {/* Verification Result Card */}
              <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                <div className="panel-header">
                  <h3 className="panel-title">Cryptographic Assertion Audit</h3>
                </div>

                {vcVerificationResult ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", backgroundColor: vcVerificationResult.is_valid ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", border: `1px solid ${vcVerificationResult.is_valid ? "var(--status-stable)" : "var(--status-action)"}` }}>
                      {vcVerificationResult.is_valid ? (
                        <CheckCircle size={28} color="var(--status-stable)" />
                      ) : (
                        <AlertTriangle size={28} color="var(--status-action)" />
                      )}
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
                          {vcVerificationResult.is_valid ? "VERIFICATION SUCCESSFUL" : "VERIFICATION FAILED"}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "0.1rem" }}>
                          {vcVerificationResult.message}
                        </div>
                      </div>
                    </div>

                    {vcVerificationResult.is_valid && vcVerificationResult.details && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                        <div>
                          <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>ISSUER DID</div>
                          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>{vcVerificationResult.details.issuer}</div>
                        </div>

                        <div>
                          <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>SUBJECT DID</div>
                          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>{vcVerificationResult.details.subject.id}</div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                          <div>
                            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>REPAYMENT CONSISTENCY</div>
                            <div style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono)", fontWeight: "bold" }}>
                              {(vcVerificationResult.details.subject.repaymentConsistency * 100).toFixed(0)}%
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>STABILITY INDEX</div>
                            <div style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono)", fontWeight: "bold" }}>
                              {vcVerificationResult.details.subject.cashFlowStabilityIndex.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>CRYPTO SIGNATURE METHOD</div>
                          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--accent-teal)" }}>
                            {vcVerificationResult.details.proofType} (HMAC-SHA256 Assertion Key)
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    Paste a Verifiable Credential or click 'Load Sita Devi VC' and verify.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: Compliance View */}
          {activeTab === "compliance" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              {/* Scan Results */}
              <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="panel-header">
                  <h3 className="panel-title">Decoupled Scan Report</h3>
                  <span className="badge" style={{ backgroundColor: compliance?.is_compliance_alert ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)", color: compliance?.is_compliance_alert ? "var(--status-action)" : "var(--status-stable)" }}>
                    {compliance?.is_compliance_alert ? "ALERT DETECTED" : "CLEAR"}
                  </span>
                </div>

                {selectedEnt && (
                  <div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Target Business</div>
                    <div style={{ fontSize: "1rem", fontWeight: "bold" }}>{selectedEnt.name} ({selectedEnt.id})</div>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                  <div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>SANCTIONS & PEP MATCHING RESULTS</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      {compliance?.registry_check?.reason}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>TRANSACTION DEVIATIONS</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      {compliance?.aml_check?.flags?.length > 0 ? (
                        <div style={{ color: "var(--status-action)", fontWeight: "bold" }}>
                          {compliance.aml_check.flags.map((f: any, idx: number) => (
                            <div key={idx} style={{ marginTop: "0.25rem" }}>• {f.description}</div>
                          ))}
                        </div>
                      ) : (
                        "No structurings or layering indicators discovered."
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Blacklisted Forms */}
              <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="panel-header">
                  <h3 className="panel-title">Interactive Blacklist Simulation</h3>
                </div>

                <form onSubmit={handleAddBlacklist} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                      Blacklist Target Name
                    </label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={blacklistName}
                      onChange={(e) => setBlacklistName(e.target.value)}
                      placeholder="e.g. Dawood Ibrahim, Sita Devi, Amit Patel"
                      style={{ marginTop: "0.25rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                      Registry Classification
                    </label>
                    <select 
                      className="form-control"
                      value={blacklistCategory}
                      onChange={(e) => setBlacklistCategory(e.target.value)}
                      style={{ marginTop: "0.25rem" }}
                    >
                      <option value="sanction">Sanctions Blacklist (Critical Blocks)</option>
                      <option value="pep">Politically Exposed Person (PEP Watchlist)</option>
                    </select>
                  </div>

                  {blacklistMsg && (
                    <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--status-watch)" }}>
                      {blacklistMsg}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                    <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                      Add to Blacklist
                    </button>
                    <button type="button" className="btn-outline" onClick={handleResetCompliance}>
                      Reset registries
                    </button>
                  </div>
                </form>

                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  Adding a name like <strong>Ram Charan</strong> or <strong>Amit Patel</strong> immediately flags compliance alerts and updates GNN credit risks.
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: Federated Learning View */}
          {activeTab === "federated" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
              <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="panel-header">
                  <h3 className="panel-title">Federated Aggregation Node</h3>
                </div>

                {federatedStatus ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Aggregation Round</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: "bold", fontFamily: "var(--font-mono)" }}>
                          Round {federatedStatus.current_round}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Privacy Spent (Epsilon)</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: "bold", fontFamily: "var(--font-mono)", color: "var(--status-watch)" }}>
                          ε = {federatedStatus.epsilon_spent.toFixed(1)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Global Weights Coefficients</div>
                      <div style={{ backgroundColor: "var(--bg-secondary)", padding: "0.75rem", fontFamily: "var(--font-mono)", fontSize: "0.75rem", border: "1px solid var(--border-color)", marginTop: "0.25rem" }}>
                        Rainfall Factor: {federatedStatus.global_weights[0]} <br/>
                        Market Price Factor: {federatedStatus.global_weights[1]} <br/>
                        Operating Cost Factor: {federatedStatus.global_weights[2]} <br/>
                        Global Bias: {federatedStatus.global_bias}
                      </div>
                    </div>

                    <button 
                      className="btn-primary" 
                      onClick={triggerFederatedRound}
                      disabled={loading}
                      style={{ padding: "0.6rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}
                    >
                      {loading ? (
                        <>
                          <RefreshCw size={14} className="pulse-active" />
                          Aggregating...
                        </>
                      ) : (
                        "Trigger Federated Aggregation Round"
                      )}
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Loading coordinator state...</div>
                )}
              </div>

              {/* Loss Curve Plot */}
              <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="panel-header">
                  <h3 className="panel-title">Model Convergence History</h3>
                </div>
                {renderFederatedLossCurve()}
              </div>
            </div>
          )}

          {/* TAB 8: Ledger view */}
          {activeTab === "ledger" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className="panel">
                <div className="panel-header">
                  <h3 className="panel-title">Audit Log block list</h3>
                  <button className="badge btn-outline" onClick={triggerAuditVerification}>
                    Validate Chain Integrity
                  </button>
                </div>

                {ledgerVerification && (
                  <div 
                    style={{ 
                      backgroundColor: ledgerVerification.includes("tamper") || ledgerVerification.includes("WARNING") ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                      border: `1px solid ${ledgerVerification.includes("tamper") || ledgerVerification.includes("WARNING") ? "var(--status-action)" : "var(--status-stable)"}`,
                      padding: "0.5rem",
                      fontSize: "0.8rem",
                      marginBottom: "1rem",
                      fontWeight: "bold",
                      color: ledgerVerification.includes("tamper") || ledgerVerification.includes("WARNING") ? "var(--status-action)" : "var(--status-stable)"
                    }}
                  >
                    {ledgerVerification}
                  </div>
                )}

                <div className="data-table-container" style={{ maxHeight: "400px", overflowY: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Block ID</th>
                        <th>Timestamp</th>
                        <th>Event Type</th>
                        <th>Actor</th>
                        <th>Payload</th>
                        <th>Prev Block Hash</th>
                        <th>Block Hash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log: any) => (
                        <tr key={log.id}>
                          <td className="mono-digits" style={{ fontWeight: "bold" }}>#{log.id}</td>
                          <td className="mono-digits">{log.timestamp.slice(11, 19)}</td>
                          <td>
                            <span className="badge badge-purple" style={{ fontSize: "0.6rem" }}>{log.event_type}</span>
                          </td>
                          <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>{log.actor}</td>
                          <td style={{ maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.75rem" }}>
                            {log.payload}
                          </td>
                          <td className="mono-digits" style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
                            {log.prev_hash.slice(0, 8)}...
                          </td>
                          <td className="mono-digits" style={{ color: "var(--accent-blue)", fontSize: "0.7rem", fontWeight: "bold" }}>
                            {log.hash.slice(0, 8)}...
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: Simulator Tab */}
          {activeTab === "simulator" && (
            <div 
              style={{ 
                backgroundColor: "var(--bg-secondary)", 
                padding: "2rem 1.5rem", 
                display: "flex", 
                flexDirection: "column",
                alignItems: "center",
                overflowY: "auto",
                border: "1px solid var(--border-color)",
                transition: "background-color var(--transition-speed) ease"
              }}
            >
              <div style={{ width: "100%", maxWidth: "340px", marginBottom: "1rem", textAlign: "center" }}>
                <span className="badge badge-blue">Entrepreneur Sandbox</span>
                <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Interact with the phone simulator below to check farmer's dashboard, voice answers, and verifiable credentials.
                </p>
              </div>

              <MobileSimulator
                selectedEnterpriseId={selectedEntId}
                enterpriseName={selectedEnt?.name || "Loading..."}
                interestRate={selectedEnt?.interest_rate || 12}
                sandboxInputs={sandboxInputs}
                setSandboxInputs={setSandboxInputs}
                forecastResult={forecast}
                onRefresh={updateSelectedData}
              />
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

export default App;
