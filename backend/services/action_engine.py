from typing import Dict, Any, List

class ActionEngineService:
    def __init__(self):
        # Database of simulated Indian government schemes
        self.schemes = [
            {
                "id": "SCHEME_KCC_SUBVENTION",
                "name": "Kisan Credit Card (KCC) Interest Subvention",
                "eligibility": "Individual crop farmers with active credit",
                "benefit": "3.0% interest rate reduction for timely repayment",
                "description": "Government of India subsidy to lower credit costs for prompt paying farmers."
            },
            {
                "id": "SCHEME_PMFBY",
                "name": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
                "eligibility": "Farmers suffering crop losses due to weather/drought shocks",
                "benefit": "Immediate payout of up to 80% of crop value based on weather-index metrics",
                "description": "Parametric crop insurance covering sowing failures, localized calamities, and post-harvest losses."
            },
            {
                "id": "SCHEME_PM_KISAN",
                "name": "PM-KISAN Samman Nidhi",
                "eligibility": "Small and marginal landholder farmers with income deficit",
                "benefit": "INR 6,000 direct income support transfer per year",
                "description": "Direct cash benefit to support agricultural household needs and seed procurement."
            },
            {
                "id": "SCHEME_AMIF",
                "name": "Agri-Market Infrastructure Fund (AMIF)",
                "eligibility": "Farmer Producer Organizations (FPOs) and SHGs scaling operations",
                "benefit": "Interest-free working capital loan up to INR 2 Lakhs",
                "description": "Subsidized infrastructure funding for post-harvest storage and transport."
            }
        ]

    def calculate_dynamic_rate(self, base_rate: float, status: str, repayment_rate: float, volatility: float) -> float:
        """
        Behavior-adjusted dynamic pricing engine.
        Ticks interest rate down (rewarding good behavior) or up within an approved band (e.g. 8.0% - 14.0%).
        """
        adjusted_rate = base_rate
        
        # Reward high repayment rates and low forecast volatility
        if repayment_rate >= 0.95 and volatility < 0.15:
            # Consistent good behavior: drop rate
            adjusted_rate -= 1.5
        elif repayment_rate >= 0.90 and volatility < 0.25:
            adjusted_rate -= 0.75
            
        # Adjust based on current risk forecasting status
        if status == "stable":
            adjusted_rate -= 0.5
        elif status == "watch":
            adjusted_rate += 0.5
        elif status == "action-required":
            adjusted_rate += 1.25
            
        # Bound rate between 8.0% and 14.0%
        return float(round(max(8.0, min(14.0, adjusted_rate)), 2))

    def match_schemes(self, category: str, forecast_status: str, causal_explanations: List[str]) -> List[Dict[str, Any]]:
        """
        Matches real-time cash flow failures/factors to government schemes before listing them as raw credit risks.
        """
        matched = []
        is_weather_shock = any("drought" in exp.lower() or "rainfall" in exp.lower() or "flood" in exp.lower() for exp in causal_explanations)
        is_price_drop = any("price" in exp.lower() for exp in causal_explanations)
        
        # Crop insurance match
        if is_weather_shock:
            matched.append(next(s for s in self.schemes if s["id"] == "SCHEME_PMFBY"))
            
        # KCC match for low risk / stable categories
        if forecast_status == "stable":
            matched.append(next(s for s in self.schemes if s["id"] == "SCHEME_KCC_SUBVENTION"))
            
        # Income support for distressed individual farmers
        if forecast_status == "action-required" and category in ["cotton", "rice"]:
            matched.append(next(s for s in self.schemes if s["id"] == "SCHEME_PM_KISAN"))
            
        # FPO support
        if category == "dairy":
            matched.append(next(s for s in self.schemes if s["id"] == "SCHEME_AMIF"))
            
        # Fallback to KCC if nothing matched
        if not matched:
            matched.append(next(s for s in self.schemes if s["id"] == "SCHEME_KCC_SUBVENTION"))
            
        return matched

    def determine_interventions(self, 
                               category: str,
                               forecast_status: str, 
                               repayment_rate: float,
                               volatility: float,
                               causal_explanations: List[str]) -> Dict[str, Any]:
        """
        Returns paired interventions for the risk status.
        """
        matched_schemes = self.match_schemes(category, forecast_status, causal_explanations)
        
        # Determine logical mitigation actions
        mitigation_actions = []
        is_weather_shock = any("drought" in exp.lower() or "rainfall" in exp.lower() or "flood" in exp.lower() for exp in causal_explanations)
        
        if forecast_status == "action-required":
            if is_weather_shock:
                mitigation_actions.append({
                    "action_code": "SHIFT_REPAYMENT_DATE",
                    "title": "Flexible Repayment Extension",
                    "description": "Defer repayment by 30 days due to localized rainfall shock (parametric trigger verified)."
                })
            else:
                mitigation_actions.append({
                    "action_code": "RECEIVABLES_BRIDGE_LOAN",
                    "title": "Purchase-Order Backed Liquidity Bridge",
                    "description": "Disburse a short-term 0% interest bridge loan backed by pending offtake contract to cover cash flow gap."
                })
        elif forecast_status == "watch":
            mitigation_actions.append({
                "action_code": "BUFFER_OPTIMIZE",
                "title": "Optimize SHG Liquidity Buffer",
                "description": "Increase community self-insurance buffer contributions by 5% to absorb volatility."
            })
        else:
            # Stable status: growth nudges
            mitigation_actions.append({
                "action_code": "GROWTH_NUDGE",
                "title": "Pre-Approved Credit Limit Increase",
                "description": "Eligible for 20% expansion of micro-credit limit at lower interest rate due to high repayment buffers."
            })
            
        return {
            "recommended_action": mitigation_actions[0] if mitigation_actions else None,
            "all_mitigations": mitigation_actions,
            "matched_schemes": matched_schemes
        }
