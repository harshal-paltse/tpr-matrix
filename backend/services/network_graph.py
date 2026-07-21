from typing import List, Dict, Any, Tuple

class NetworkGraphService:
    def __init__(self):
        self.interventions = {}
        # We start with a seeded set of nodes and edges representing 3 village clusters
        # and some mock participants.
        self.nodes = {
            # Cotton Cluster Nodes
            "SHG_COTTON_1": {"id": "SHG_COTTON_1", "type": "shg", "label": "Cotton Growers SHG", "base_risk": 0.1, "repayment_status": "good"},
            "FARMER_C1": {"id": "FARMER_C1", "type": "farmer", "label": "Ram Charan", "base_risk": 0.05, "repayment_status": "good"},
            "FARMER_C2": {"id": "FARMER_C2", "type": "farmer", "label": "Sita Devi", "base_risk": 0.85, "repayment_status": "default-risk"}, # Distressed
            "FARMER_C3": {"id": "FARMER_C3", "type": "farmer", "label": "Karan Singh", "base_risk": 0.12, "repayment_status": "good"},
            
            # Dairy Cluster Nodes
            "FPO_DAIRY_1": {"id": "FPO_DAIRY_1", "type": "fpo", "label": "Ganga Dairy Producer Org", "base_risk": 0.08, "repayment_status": "good"},
            "FARMER_D1": {"id": "FARMER_D1", "type": "farmer", "label": "Amit Patel", "base_risk": 0.04, "repayment_status": "good"},
            "FARMER_D2": {"id": "FARMER_D2", "type": "farmer", "label": "Sunita Rao", "base_risk": 0.10, "repayment_status": "good"},
            
            # Circular Loop Coordinated Fraud Ring (simulated synthetic loop)
            "FARMER_M1": {"id": "FARMER_M1", "type": "farmer", "label": "Mule Entity A", "base_risk": 0.5, "repayment_status": "good"},
            "FARMER_M2": {"id": "FARMER_M2", "type": "farmer", "label": "Mule Entity B", "base_risk": 0.5, "repayment_status": "good"},
            "FARMER_M3": {"id": "FARMER_M3", "type": "farmer", "label": "Mule Entity C", "base_risk": 0.5, "repayment_status": "good"}
        }

        # Edges model loan guarantees, group membership, and transactions
        self.edges = [
            # Cotton SHG Guarantees
            {"source": "FARMER_C1", "target": "SHG_COTTON_1", "weight": 1.0, "type": "membership"},
            {"source": "FARMER_C2", "target": "SHG_COTTON_1", "weight": 1.0, "type": "membership"},
            {"source": "FARMER_C3", "target": "SHG_COTTON_1", "weight": 1.0, "type": "membership"},
            
            # Guarantee links between members (cross-guarantees)
            {"source": "FARMER_C1", "target": "FARMER_C2", "weight": 0.8, "type": "guarantor"},
            {"source": "FARMER_C2", "target": "FARMER_C3", "weight": 0.8, "type": "guarantor"},
            {"source": "FARMER_C3", "target": "FARMER_C1", "weight": 0.8, "type": "guarantor"},
            
            # Dairy FPO
            {"source": "FARMER_D1", "target": "FPO_DAIRY_1", "weight": 1.0, "type": "member"},
            {"source": "FARMER_D2", "target": "FPO_DAIRY_1", "weight": 1.0, "type": "member"},
            
            # Coordinated Fraud Ring - Circular transaction loop to game the system
            {"source": "FARMER_M1", "target": "FARMER_M2", "weight": 2.5, "type": "transaction"},
            {"source": "FARMER_M2", "target": "FARMER_M3", "weight": 2.5, "type": "transaction"},
            {"source": "FARMER_M3", "target": "FARMER_M1", "weight": 2.5, "type": "transaction"}
        ]

    def get_neighbors(self, node_id: str) -> List[Tuple[str, float, str]]:
        """Returns list of (neighbor_id, edge_weight, edge_type)"""
        neighbors = []
        for edge in self.edges:
            if edge["source"] == node_id:
                neighbors.append((edge["target"], edge["weight"], edge["type"]))
            elif edge["target"] == node_id:
                neighbors.append((edge["source"], edge["weight"], edge["type"]))
        return neighbors

    def propagate_peer_risk(self, iterations: int = 2) -> Dict[str, float]:
        """
        GNN peer-risk message passing approximation.
        Propagates distress/risk signals through joint guarantee and membership edges.
        """
        current_risk = {}
        for nid, ninfo in self.nodes.items():
            base = ninfo["base_risk"]
            if nid in self.interventions:
                base = max(0.05, base - self.interventions[nid])
            current_risk[nid] = base
        
        # Message passing iterations
        for _ in range(iterations):
            next_risk = {}
            for node_id, node_info in self.nodes.items():
                neighbors = self.get_neighbors(node_id)
                if not neighbors:
                    next_risk[node_id] = current_risk[node_id]
                    continue
                
                # Weight risk contribution of neighbors
                neighbor_risk_sum = 0.0
                total_weight = 0.0
                for neigh_id, weight, edge_type in neighbors:
                    # Guarantee edges propagate risk heavier
                    multiplier = 1.5 if edge_type == "guarantor" else 1.0
                    neighbor_risk_sum += current_risk[neigh_id] * weight * multiplier
                    total_weight += weight * multiplier
                
                avg_neighbor_risk = neighbor_risk_sum / total_weight if total_weight > 0 else 0.0
                
                # Formula: 60% own base risk + 40% neighbor/peer risk
                next_risk[node_id] = 0.6 * node_info["base_risk"] + 0.4 * avg_neighbor_risk
                next_risk[node_id] = min(1.0, max(0.0, next_risk[node_id]))
            current_risk = next_risk
            
        return current_risk

    def detect_fraud_rings(self) -> List[Dict[str, Any]]:
        """
        Community/loop detection to find fraud rings.
        Looks specifically for circular transaction paths (mule loops) that are anomalous.
        """
        fraud_rings = []
        
        # Simple DFS cycle detection to find circular transaction loops
        def find_cycles():
            visited = set()
            path = []
            cycles = []
            
            def dfs(node, parent):
                visited.add(node)
                path.append(node)
                
                for neigh, _, edge_type in self.get_neighbors(node):
                    if edge_type != "transaction":
                        continue
                    if neigh not in visited:
                        dfs(neigh, node)
                    elif neigh in path and len(path) - path.index(neigh) >= 3:
                        # Cycle found with length >= 3
                        cycle_path = path[path.index(neigh):]
                        if sorted(cycle_path) not in [sorted(c) for c in cycles]:
                            cycles.append(cycle_path)
                            
                path.pop()
                
            for node in self.nodes:
                if node not in visited:
                    dfs(node, None)
            return cycles

        transaction_cycles = find_cycles()
        
        for cycle in transaction_cycles:
            fraud_rings.append({
                "ring_nodes": cycle,
                "anomaly_score": 0.95, # High because it's a tight, closed circular transaction cycle
                "description": "Circular transaction loop detected. Synthetic entities or mule accounts likely fabricating credit histories."
            })
            
        return fraud_rings

    def get_full_graph_state(self) -> Dict[str, Any]:
        """
        Returns full nodes and edges data including propagated risk values
        and flags for dashboard rendering.
        """
        propagated_risks = self.propagate_peer_risk()
        fraud_rings = self.detect_fraud_rings()
        
        fraudulent_nodes = set()
        for ring in fraud_rings:
            fraudulent_nodes.update(ring["ring_nodes"])
            
        formatted_nodes = []
        for nid, info in self.nodes.items():
            final_risk = propagated_risks[nid]
            status = "stable"
            if final_risk > 0.6:
                status = "action-required"
            elif final_risk > 0.3 or nid in fraudulent_nodes:
                status = "watch"
                
            formatted_nodes.append({
                "id": nid,
                "type": info["type"],
                "label": info["label"],
                "base_risk": info["base_risk"],
                "current_risk": final_risk,
                "repayment_status": info["repayment_status"],
                "status": status,
                "is_fraud_flagged": nid in fraudulent_nodes
            })
            
        return {
            "nodes": formatted_nodes,
            "edges": self.edges,
            "fraud_rings": fraud_rings
        }
