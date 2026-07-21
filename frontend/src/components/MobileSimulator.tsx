import React, { useState, useEffect } from "react";
import { Mic, Shield, Sliders, RefreshCw, MessageSquare, Play } from "lucide-react";

interface MobileSimulatorProps {
  selectedEnterpriseId: string;
  enterpriseName: string;
  interestRate: number;
  sandboxInputs: {
    rainfall_deviation_pct: number;
    price_deviation_pct: number;
    cost_deviation_pct: number;
    rainfall_delay_weeks: number;
  };
  setSandboxInputs: React.Dispatch<React.SetStateAction<{
    rainfall_deviation_pct: number;
    price_deviation_pct: number;
    cost_deviation_pct: number;
    rainfall_delay_weeks: number;
  }>>;
  forecastResult: any;
  onRefresh: () => void;
}

export const MobileSimulator: React.FC<MobileSimulatorProps> = ({
  selectedEnterpriseId,
  enterpriseName,
  interestRate,
  sandboxInputs,
  setSandboxInputs,
  forecastResult,
  onRefresh,
}) => {
  const [activeScreen, setActiveScreen] = useState<"dashboard" | "sandbox" | "assistant" | "wallet">("dashboard");
  const [voiceMessages, setVoiceMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    { sender: "ai", text: "Namaste! I am your cash flow advisor. Ask me anything in your language, or run what-if simulations." }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [vcData, setVcData] = useState<any>(null);
  const [showVCJson, setShowVCJson] = useState(false);

  // Auto-fetch VC if we toggle to wallet
  useEffect(() => {
    if (activeScreen === "wallet") {
      fetch(`http://127.0.0.1:8000/api/enterprises/${selectedEnterpriseId}/credential`)
        .then((res) => res.json())
        .then((data) => setVcData(data))
        .catch(() => {});
    }
  }, [activeScreen, selectedEnterpriseId]);

  const handleSliderChange = (field: string, value: number) => {
    setSandboxInputs((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getStatusLabel = (status: string) => {
    if (status === "action-required") return "ACTION REQUIRED";
    if (status === "watch") return "WATCH STATE";
    return "STABLE HEALTH";
  };

  const getStatusColor = (status: string) => {
    if (status === "action-required") return "var(--status-action)";
    if (status === "watch") return "var(--status-watch)";
    return "var(--status-stable)";
  };

  // Simulates voice synthesis response
  const triggerVoiceQuery = (query: string, reply: string) => {
    setVoiceMessages((prev) => [...prev, { sender: "user", text: query }]);
    setIsTyping(true);

    setTimeout(() => {
      setVoiceMessages((prev) => [...prev, { sender: "ai", text: reply }]);
      setIsTyping(false);
      
      // Simple text-to-speech simulation via Web Speech API
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(reply);
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    }, 1200);
  };

  const voicePrompts = [
    {
      q: "Will I cover my next loan payment?",
      a: forecastResult?.status === "stable" 
        ? "Yes! Your cash reserves are high. Based on stable crop prices, your next repayment is 100% covered."
        : "Warning. Late rains have cut yield by 20%. Your reserves are low. But don't worry, you qualify for Fasal Bima crop insurance payout."
    },
    {
      q: "How can I lower my loan interest rate?",
      a: `Maintain high repayment history. Your current behavior rate is ${forecastResult?.dynamic_interest_rate || interestRate}%. Keeping your cash flow stable can drop this to 8.0%.`
    },
    {
      q: "Can I get help with my crop failure gap?",
      a: "Yes. I detected a weather shock in your region. I have matched you with PM Kisan scheme for direct income support of INR 6,000."
    }
  ];

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      {/* Smartphone Outer Shell */}
      <div 
        style={{
          width: "360px",
          height: "640px",
          border: "8px solid #242936",
          borderRadius: "28px",
          backgroundColor: "var(--bg-primary)",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
        }}
      >
        {/* Speaker and Camera notch */}
        <div style={{ height: "24px", backgroundColor: "#242936", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ width: "60px", height: "4px", backgroundColor: "#08090c", borderRadius: "2px" }}></div>
        </div>

        {/* Application Header inside phone */}
        <div 
          style={{ 
            padding: "1rem", 
            borderBottom: "1px solid var(--border-color)", 
            backgroundColor: "var(--bg-secondary)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              {selectedEnterpriseId}
            </div>
            <div style={{ fontSize: "0.875rem", fontWeight: "bold" }}>{enterpriseName}</div>
          </div>
          <button 
            onClick={onRefresh}
            style={{ 
              background: "none", 
              border: "none", 
              color: "var(--text-secondary)", 
              cursor: "pointer" 
            }}
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Mobile Screens Viewport */}
        <div style={{ flex: 1, padding: "1rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
          
          {/* SCREEN 1: Simple Dashboard */}
          {activeScreen === "dashboard" && (
            <>
              {/* Voice-First Quick Action Area */}
              <div 
                onClick={() => setActiveScreen("assistant")}
                style={{ 
                  backgroundColor: "rgba(59, 130, 246, 0.1)", 
                  border: "1px dashed var(--accent-blue)",
                  padding: "1.25rem",
                  textAlign: "center",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <div style={{ backgroundColor: "var(--accent-blue)", borderRadius: "50%", padding: "0.75rem", color: "#fff" }}>
                  <Mic size={24} className="pulse-active" />
                </div>
                <div style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Tap to Talk to AI Assistant</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Ask about payments, subsidies & yields</div>
              </div>

              {/* Cash Flow Status Indicator Card */}
              <div 
                className="panel" 
                style={{ 
                  borderColor: getStatusColor(forecastResult?.status),
                  backgroundColor: "var(--bg-secondary)"
                }}
              >
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>CURRENT OUTLOOK</div>
                <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: getStatusColor(forecastResult?.status), marginTop: "0.25rem" }}>
                  {getStatusLabel(forecastResult?.status)}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                  <div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Lending Rate</div>
                    <div style={{ fontSize: "1rem", fontFamily: "var(--font-mono)", fontWeight: "bold" }}>
                      {forecastResult?.dynamic_interest_rate || interestRate}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Repayment target</div>
                    <div style={{ fontSize: "1rem", fontFamily: "var(--font-mono)", fontWeight: "bold" }}>
                      INR {forecastResult?.loan_repayment_monthly || 8000}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommended Immediate Action */}
              {forecastResult?.recommended_action && (
                <div className="panel" style={{ borderLeft: `3px solid ${getStatusColor(forecastResult?.status)}` }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>MITIGATION RECOMMENDATION</div>
                  <div style={{ fontSize: "0.875rem", fontWeight: "bold", marginTop: "0.25rem" }}>
                    {forecastResult.recommended_action.title}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                    {forecastResult.recommended_action.description}
                  </div>
                </div>
              )}
            </>
          )}

          {/* SCREEN 2: What-if Sandbox Sliders */}
          {activeScreen === "sandbox" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: "bold" }}>Causal Simulation Sandbox</div>
              
              <div className="slider-container">
                <div className="slider-header">
                  <span>Monsoon Rainfall</span>
                  <span>{sandboxInputs.rainfall_deviation_pct}%</span>
                </div>
                <input 
                  type="range" 
                  min="-50" 
                  max="50" 
                  value={sandboxInputs.rainfall_deviation_pct} 
                  onChange={(e) => handleSliderChange("rainfall_deviation_pct", Number(e.target.value))}
                  className="slider-input" 
                />
              </div>

              <div className="slider-container">
                <div className="slider-header">
                  <span>Monsoon Arrival Delay</span>
                  <span>{sandboxInputs.rainfall_delay_weeks} Weeks</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="6" 
                  value={sandboxInputs.rainfall_delay_weeks} 
                  onChange={(e) => handleSliderChange("rainfall_delay_weeks", Number(e.target.value))}
                  className="slider-input" 
                />
              </div>

              <div className="slider-container">
                <div className="slider-header">
                  <span>Wholesale Market Price</span>
                  <span>{sandboxInputs.price_deviation_pct}%</span>
                </div>
                <input 
                  type="range" 
                  min="-40" 
                  max="40" 
                  value={sandboxInputs.price_deviation_pct} 
                  onChange={(e) => handleSliderChange("price_deviation_pct", Number(e.target.value))}
                  className="slider-input" 
                />
              </div>

              <div className="slider-container">
                <div className="slider-header">
                  <span>Input Operating Costs</span>
                  <span>{sandboxInputs.cost_deviation_pct}%</span>
                </div>
                <input 
                  type="range" 
                  min="-20" 
                  max="40" 
                  value={sandboxInputs.cost_deviation_pct} 
                  onChange={(e) => handleSliderChange("cost_deviation_pct", Number(e.target.value))}
                  className="slider-input" 
                />
              </div>

              <div className="panel" style={{ backgroundColor: "var(--bg-secondary)", padding: "1rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>PROJECTED IMPACT</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
                  <div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Expected Revenue</div>
                    <div style={{ fontSize: "0.875rem", fontWeight: "bold", fontFamily: "var(--font-mono)" }}>
                      INR {forecastResult ? (forecastResult.expected_yield_kg * forecastResult.expected_price_per_kg).toFixed(0) : 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Operating Margin</div>
                    <div style={{ fontSize: "0.875rem", fontWeight: "bold", fontFamily: "var(--font-mono)" }}>
                      INR {forecastResult?.repayment_buffer ? forecastResult.repayment_buffer.toFixed(0) : 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 3: Voice Assistant Chat */}
          {activeScreen === "assistant" && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", justifySelf: "stretch" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "360px", overflowY: "auto", paddingBottom: "1rem" }}>
                {voiceMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    style={{
                      alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                      backgroundColor: msg.sender === "user" ? "var(--accent-blue)" : "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.75rem",
                      maxWidth: "80%",
                      borderRadius: "0px",
                      border: msg.sender === "user" ? "none" : "1px solid var(--border-color)"
                    }}
                  >
                    {msg.text}
                  </div>
                ))}
                {isTyping && (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", fontFamily: "var(--font-mono)" }}>AI is speaking...</div>
                )}
              </div>

              {/* Pre-recorded Query Tap Buttons */}
              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>TAP TO SPEAK QUESTION</div>
                {voicePrompts.map((prompt, idx) => (
                  <button 
                    key={idx}
                    onClick={() => triggerVoiceQuery(prompt.q, prompt.a)}
                    disabled={isTyping}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      backgroundColor: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      padding: "0.4rem 0.75rem",
                      fontSize: "0.7rem",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <Play size={10} fill="var(--text-primary)" />
                    {prompt.q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SCREEN 4: Portable Trust VC Wallet */}
          {activeScreen === "wallet" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: "bold" }}>Verifiable Credentials Wallet</div>
              
              {vcData ? (
                <div 
                  className="panel" 
                  style={{ 
                    background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
                    borderColor: "var(--status-stable)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.6rem", letterSpacing: "0.05em", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>W3C COMPLIANT</span>
                    <Shield size={16} color="var(--status-stable)" />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>CREDENTIAL SUBJECT</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: "bold" }}>{vcData.credentialSubject?.enterpriseName}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Repayment consistency</div>
                      <div style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono)", fontWeight: "bold" }}>
                        {(vcData.credentialSubject?.repaymentConsistency * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Risk Rating</div>
                      <div style={{ fontSize: "0.85rem", color: getStatusColor(vcData.credentialSubject?.riskStatus), fontWeight: "bold" }}>
                        {vcData.credentialSubject?.riskStatus?.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.55rem", color: "var(--text-muted)", wordBreak: "break-all", fontFamily: "var(--font-mono)" }}>
                    Issuer: {vcData.issuer}
                  </div>
                </div>
              ) : (
                <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Loading credential...</div>
              )}

              <button
                onClick={() => setShowVCJson(!showVCJson)}
                className="badge badge-blue"
                style={{
                  alignSelf: "flex-start",
                  cursor: "pointer",
                  background: "none",
                  border: "1px solid var(--accent-blue)",
                  padding: "0.35rem 0.6rem"
                }}
              >
                {showVCJson ? "Hide JSON-LD Source" : "Inspect Cryptographic Signature"}
              </button>

              {showVCJson && vcData && (
                <pre 
                  style={{ 
                    fontSize: "0.6rem", 
                    backgroundColor: "var(--bg-secondary)", 
                    padding: "0.5rem", 
                    overflowX: "auto", 
                    maxHeight: "160px",
                    border: "1px solid var(--border-color)" 
                  }}
                >
                  {JSON.stringify(vcData, null, 2)}
                </pre>
              )}
            </div>
          )}

        </div>

        {/* Smartphone Navigation Bar */}
        <div 
          style={{ 
            height: "48px", 
            borderTop: "1px solid var(--border-color)", 
            backgroundColor: "var(--bg-secondary)",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center"
          }}
        >
          <button 
            onClick={() => setActiveScreen("dashboard")}
            style={{ 
              background: "none", 
              border: "none", 
              color: activeScreen === "dashboard" ? "var(--text-primary)" : "var(--text-muted)", 
              fontSize: "0.65rem",
              fontFamily: "var(--font-mono)",
              cursor: "pointer"
            }}
          >
            DASHBOARD
          </button>
          <button 
            onClick={() => setActiveScreen("sandbox")}
            style={{ 
              background: "none", 
              border: "none", 
              color: activeScreen === "sandbox" ? "var(--text-primary)" : "var(--text-muted)", 
              fontSize: "0.65rem",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "2px"
            }}
          >
            <Sliders size={10} />
            SANDBOX
          </button>
          <button 
            onClick={() => setActiveScreen("assistant")}
            style={{ 
              background: "none", 
              border: "none", 
              color: activeScreen === "assistant" ? "var(--text-primary)" : "var(--text-muted)", 
              fontSize: "0.65rem",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "2px"
            }}
          >
            <MessageSquare size={10} />
            VOICE
          </button>
          <button 
            onClick={() => setActiveScreen("wallet")}
            style={{ 
              background: "none", 
              border: "none", 
              color: activeScreen === "wallet" ? "var(--text-primary)" : "var(--text-muted)", 
              fontSize: "0.65rem",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "2px"
            }}
          >
            <Shield size={10} />
            WALLET
          </button>
        </div>
      </div>
    </div>
  );
};
