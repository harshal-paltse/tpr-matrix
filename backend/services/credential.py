import json
import hashlib
import hmac
import uuid
from datetime import datetime
from typing import Dict, Any

class CredentialService:
    def __init__(self):
        # Secret key used for signing credentials (simulated KMS key)
        self.signing_secret = b"nabard_secure_kms_signing_key_2026"
        self.issuer_did = "did:nabard:risk-platform"

    def issue_credential(self, enterprise_id: str, enterprise_name: str, repayment_rate: float, status: str, stability_index: float) -> Dict[str, Any]:
        """
        Creates a signed W3C Verifiable Credential document summarizing the cash flow reliability history.
        """
        issuance_date = datetime.utcnow().isoformat() + "Z"
        cred_id = f"urn:uuid:{uuid.uuid4()}"
        
        subject = {
            "id": f"did:enterprise:{enterprise_id}",
            "enterpriseName": enterprise_name,
            "repaymentConsistency": float(repayment_rate),
            "riskStatus": status,
            "cashFlowStabilityIndex": float(stability_index),
            "credentialVerificationDate": issuance_date
        }
        
        credential_body = {
            "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://schema.org"
            ],
            "id": cred_id,
            "type": ["VerifiableCredential", "CashFlowReliabilityCredential"],
            "issuer": self.issuer_did,
            "issuanceDate": issuance_date,
            "credentialSubject": subject
        }
        
        # Cryptographic Signature (HMAC-SHA256 serving as the assertion proof)
        serialized_subject = json.dumps(subject, sort_keys=True)
        signature = hmac.new(self.signing_secret, serialized_subject.encode("utf-8"), hashlib.sha256).hexdigest()
        
        credential_body["proof"] = {
            "type": "JsonWebSignature2020",
            "created": issuance_date,
            "verificationMethod": f"{self.issuer_did}#key-1",
            "proofPurpose": "assertionMethod",
            "jws": signature
        }
        
        return credential_body

    def verify_credential(self, credential: Dict[str, Any]) -> bool:
        """
        Validates the cryptographic signature proof on a W3C Verifiable Credential.
        """
        try:
            subject = credential["credentialSubject"]
            proof = credential["proof"]
            
            # Serialize the subject exactly as it was signed
            serialized_subject = json.dumps(subject, sort_keys=True)
            expected_signature = hmac.new(self.signing_secret, serialized_subject.encode("utf-8"), hashlib.sha256).hexdigest()
            
            # Verify signature matches and issuer matches
            return hmac.compare_digest(proof["jws"], expected_signature) and credential["issuer"] == self.issuer_did
        except Exception:
            return False
