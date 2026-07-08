"""
Uncertainty-routing logic dispatcher.
Chooses whether to dispatch drone or human inspector based on model prediction confidence.
"""
from typing import Dict, Any

def dispatch_decision(attribution_confidence: float, threshold: float = 0.85) -> str:
    """
    Decides the mode of inspection.
    
    Args:
        attribution_confidence: confidence score of source attribution model.
        threshold: confidence value cutoff.
        
    Returns:
        "DRONE" or "HUMAN_INSPECTOR"
    """
    if attribution_confidence < threshold:
        return "HUMAN_INSPECTOR"  # Dispatch inspector for verification
    return "DRONE"  # Dispatch automated drone for confirmation
