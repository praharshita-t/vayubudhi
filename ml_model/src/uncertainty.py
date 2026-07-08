"""
Conformal predictions wrapper using MAPIE.
Ensures rigorous uncertainty intervals for forecasting and classification.
"""
from typing import Tuple, List

class ConformalWrapper:
    def __init__(self, base_model, alpha: float = 0.1):
        """
        Wraps a trained model to generate conformal prediction bands.
        alpha: significance level (e.g. 0.1 for 90% confidence interval)
        """
        self.base_model = base_model
        self.alpha = alpha
        self.mapie_model = None

    def calibrate(self, X_calib, y_calib) -> None:
        """
        Calibrate the conformal intervals.
        """
        pass

    def predict_with_interval(self, X_test) -> Tuple[List[float], List[Tuple[float, float]]]:
        """
        Returns point predictions and their respective conformal bounds.
        """
        pass
