"""
Validation suite for VayuBudhi ML models.
Includes RMSE benchmarks, JSD (Jensen-Shannon Divergence), and Wasserstein checks.
"""
from typing import Dict, Any, List

def calculate_rmse(predictions: List[float], ground_truth: List[float]) -> float:
    """
    Computes Root Mean Squared Error.
    """
    pass

def compare_persistence_baseline(model_rmse: float, baseline_rmse: float) -> Dict[str, Any]:
    """
    Compares the model's RMSE against a persistence baseline.
    """
    pass

def calculate_js_divergence(p_prob: List[float], q_prob: List[float]) -> float:
    """
    Computes Jensen-Shannon Divergence between two probability distributions.
    """
    pass

def calculate_wasserstein_distance(p_dist: List[float], q_dist: List[float]) -> float:
    """
    Computes Wasserstein (Earth Mover's) Distance.
    """
    pass
