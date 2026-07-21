import numpy as np
from typing import Dict, Any, List

class CausalForecastingModel:
    def __init__(self, category: str):
        self.category = category.lower()
        # Define baseline parameters based on agricultural/enterprise category
        if self.category == "cotton":
            self.base_yield_kg = 800.0
            self.optimal_rainfall_mm = 600.0
            self.base_price_per_kg = 80.0  # INR
            self.base_expenses = 30000.0  # INR
            self.loan_repayment_monthly = 8000.0
        elif self.category == "dairy":
            self.base_yield_kg = 1500.0  # Liters of milk
            self.optimal_rainfall_mm = 500.0  # Fodder growth depends on it
            self.base_price_per_kg = 45.0  # INR/Liter
            self.base_expenses = 40000.0  # Fodder, vet expenses
            self.loan_repayment_monthly = 12000.0
        else:  # "rice" or default
            self.base_yield_kg = 1200.0
            self.optimal_rainfall_mm = 1000.0
            self.base_price_per_kg = 30.0  # INR
            self.base_expenses = 25000.0  # Seed, water, labor
            self.loan_repayment_monthly = 7000.0

    def simulate(self, 
                 rainfall_deviation_pct: float = 0.0, 
                 price_deviation_pct: float = 0.0, 
                 cost_deviation_pct: float = 0.0, 
                 rainfall_delay_weeks: float = 0.0,
                 num_samples: int = 1000) -> Dict[str, Any]:
        """
        Runs Monte Carlo simulations on the causal graph:
        Rainfall (Delay/Volume) -> Crop Yield -> Sales Revenue
        Wholesale Price -> Sales Revenue
        Input Cost -> Operating Expenses
        Sales Revenue - Operating Expenses -> Net Cash Flow
        """
        np.random.seed(42)  # For deterministic reproducibility in demo
        
        # 1. Simulate Rainfall effect
        # Too little or too much rainfall reduces yield. 
        # A delay in rainfall also reduces yield (late sowing).
        actual_rainfall_factor = 1.0 + (rainfall_deviation_pct / 100.0)
        delay_penalty = max(0.0, rainfall_delay_weeks * 0.08) # 8% loss per week delay
        
        # Rainfall yield multiplier (quadratic curve centered at 1.0)
        yield_multiplier = max(0.1, 1.0 - 1.5 * (actual_rainfall_factor - 1.0)**2 - delay_penalty)
        
        # Crop yield distribution
        yield_samples = np.random.normal(
            loc=self.base_yield_kg * yield_multiplier, 
            scale=self.base_yield_kg * 0.1, 
            size=num_samples
        )
        yield_samples = np.clip(yield_samples, 0, None)
        
        # 2. Simulate Wholesale Price effect
        actual_price = self.base_price_per_kg * (1.0 + price_deviation_pct / 100.0)
        price_samples = np.random.normal(loc=actual_price, scale=actual_price * 0.05, size=num_samples)
        price_samples = np.clip(price_samples, 0, None)
        
        # 3. Simulate Cost effect
        actual_expenses = self.base_expenses * (1.0 + cost_deviation_pct / 100.0)
        expenses_samples = np.random.normal(loc=actual_expenses, scale=actual_expenses * 0.08, size=num_samples)
        expenses_samples = np.clip(expenses_samples, 0, None)
        
        # 4. Compute Sales Revenue & Net Cash Flow
        revenue_samples = yield_samples * price_samples
        cash_flow_samples = revenue_samples - expenses_samples
        
        # Calculate forecast bands
        percentiles = [10, 25, 50, 75, 90]
        bands = np.percentile(cash_flow_samples, percentiles)
        
        median_cash_flow = bands[2]
        p10_cash_flow = bands[0]
        
        # Check risk flag
        status = "stable"
        repayment_buffer = median_cash_flow - self.loan_repayment_monthly
        
        # If median cash flow doesn't cover repayment, action is required.
        # If the 10th percentile is negative or below repayment, trigger a watch.
        if median_cash_flow < self.loan_repayment_monthly:
            status = "action-required"
        elif p10_cash_flow < self.loan_repayment_monthly:
            status = "watch"
            
        # Determine causal factors for natural language explanation
        explanations = []
        if rainfall_deviation_pct < -20:
            explanations.append(f"Severe drought conditions ({rainfall_deviation_pct:.1f}% rainfall drop) reduce expected yield by {abs(yield_multiplier - 1.0)*100:.1f}%.")
        elif rainfall_deviation_pct > 20:
            explanations.append(f"Excessive rainfall/flood conditions (+{rainfall_deviation_pct:.1f}%) damage crop and reduce yield by {abs(yield_multiplier - 1.0)*100:.1f}%.")
            
        if rainfall_delay_weeks > 0:
            explanations.append(f"Late monsoon arrival (delayed by {rainfall_delay_weeks} weeks) causes a late sowing penalty of {delay_penalty*100:.1f}% on yield.")
            
        if price_deviation_pct < -10:
            explanations.append(f"Depressed wholesale market prices ({price_deviation_pct:.1f}%) squeeze crop sales revenue.")
            
        if cost_deviation_pct > 15:
            explanations.append(f"Surge in diesel/fertilizer input costs (+{cost_deviation_pct:.1f}%) expands operating margins.")
            
        if not explanations:
            explanations.append("Cash flow stable; variables are within normal seasonal variances.")
            
        # Generate monthly projection data (mocking next 6 months using monthly index scaling)
        monthly_projections = []
        monthly_scales = [1.0, 0.9, 1.1, 0.85, 1.05, 1.2]
        
        for i, scale in enumerate(monthly_scales):
            month_cf = cash_flow_samples * scale
            m_bands = np.percentile(month_cf, percentiles)
            monthly_projections.append({
                "month": f"Month {i+1}",
                "p10": float(m_bands[0]),
                "p25": float(m_bands[1]),
                "median": float(m_bands[2]),
                "p75": float(m_bands[3]),
                "p90": float(m_bands[4]),
                "repayment_target": self.loan_repayment_monthly
            })
            
        return {
            "status": status,
            "category": self.category,
            "base_yield_kg": self.base_yield_kg,
            "expected_yield_kg": float(np.mean(yield_samples)),
            "base_price_per_kg": self.base_price_per_kg,
            "expected_price_per_kg": float(np.mean(price_samples)),
            "expected_expenses": float(np.mean(expenses_samples)),
            "forecast_bands": {
                "p10": float(bands[0]),
                "p25": float(bands[1]),
                "median": float(bands[2]),
                "p75": float(bands[3]),
                "p90": float(bands[4]),
            },
            "explanations": explanations,
            "monthly_projections": monthly_projections,
            "loan_repayment_monthly": self.loan_repayment_monthly,
            "repayment_buffer": float(repayment_buffer)
        }
