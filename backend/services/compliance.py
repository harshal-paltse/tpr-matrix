from typing import Dict, Any, List

class ComplianceService:
    def __init__(self):
        self.reset_registries()

    def reset_registries(self):
        # Mock Sanction List (OFAC / Indian Government Home Ministry lists)
        self.sanctioned_entities = {
            "Mule Entity C",
            "Dawood Ibrahim",
            "Illegal Syndicate Limited"
        }
        # Politically Exposed Persons (PEPs)
        self.pep_entities = {
            "Local Council President",
            "Village Sarpanch A"
        }

    def add_blacklisted_entity(self, name: str, category: str):
        if category == "sanction":
            self.sanctioned_entities.add(name)
        elif category == "pep":
            self.pep_entities.add(name)

    def check_sanctions_and_pep(self, name: str) -> Dict[str, Any]:
        """
        Cross-checks names against sanctions lists and PEP databases.
        """
        is_sanctioned = name in self.sanctioned_entities
        is_pep = name in self.pep_entities
        
        status = "clear"
        reason = "Name cleared against PEP and Sanctions registries."
        
        if is_sanctioned:
            status = "flagged-sanction"
            reason = "CRITICAL: Direct match found on international and domestic sanctions list!"
        elif is_pep:
            status = "flagged-pep"
            reason = "WARNING: Match found on Politically Exposed Person registry. Requires enhanced due diligence."
            
        return {
            "status": status,
            "reason": reason,
            "is_blocked": is_sanctioned
        }

    def scan_transactions_for_aml(self, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Scans transaction history for:
        1. Structuring: Multiple deposits just under reporting thresholds (e.g. multiple 49,000 INR transactions).
        2. Layering/Pass-through: Inflow immediately followed by outflow of similar value.
        """
        flags = []
        
        # 1. Check for Structuring (India reporting threshold is typically 50,000 INR for cash, let's check for transactions between 45k-49.9k)
        structuring_count = 0
        for tx in transactions:
            amount = abs(tx["amount"])
            if 45000 <= amount < 50000:
                structuring_count += 1
                
        if structuring_count >= 2:
            flags.append({
                "type": "AML_STRUCTURING",
                "severity": "high",
                "description": f"Multiple transactions ({structuring_count}) detected near the INR 50,000 regulatory reporting threshold."
            })
            
        # 2. Check for rapid pass-through (Layering)
        # Find credit transactions that are immediately (or within a short window) matched by debit transactions of similar amount
        for i in range(len(transactions) - 1):
            tx_current = transactions[i]
            tx_next = transactions[i+1]
            
            # If current is credit and next is debit (or vice versa) and they happen in close sequence
            if tx_current["type"] != tx_next["type"] and tx_current["enterprise_id"] == tx_next["enterprise_id"]:
                amt_diff_pct = abs(abs(tx_current["amount"]) - abs(tx_next["amount"])) / max(1, abs(tx_current["amount"]))
                if amt_diff_pct < 0.05: # within 5% match
                    flags.append({
                        "type": "AML_LAYERING_PASS_THROUGH",
                        "severity": "medium",
                        "description": f"Rapid pass-through behavior: Incoming {tx_current['type']} of INR {abs(tx_current['amount'])} followed by matching outgoing {tx_next['type']} of INR {abs(tx_next['amount'])}."
                    })
                    break # avoid duplicate flags for the same pair
                    
        return {
            "aml_status": "flagged" if flags else "clear",
            "flags": flags
        }
