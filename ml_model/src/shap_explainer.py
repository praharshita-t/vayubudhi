import os
import joblib
import shap
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, 'data')

# Cache explainers in memory to avoid rebuilding them on every request
_explainers = {}

def get_explainer(horizon=24):
    """Loads model and returns a SHAP TreeExplainer."""
    global _explainers
    
    if horizon in _explainers:
        return _explainers[horizon]
        
    model_path = os.path.join(MODEL_DIR, f'forecast_model_{horizon}h.pkl')
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found: {model_path}")
        
    mapie_model = joblib.load(model_path)
    
    # MAPIE wraps the actual estimator (LightGBM/CatBoost/XGBoost)
    base_estimator = mapie_model._estimator
    
    explainer = shap.TreeExplainer(base_estimator)
    _explainers[horizon] = explainer
    return explainer

def get_shap_values(input_features_df, horizon=24):
    """
    Computes SHAP values for a given input dataframe.
    Returns the feature contributions and the base value.
    """
    explainer = get_explainer(horizon)
    
    # Calculate SHAP values
    shap_values = explainer(input_features_df)
    
    # For a single prediction
    contributions = []
    
    # shap_values.values is a 2D array (samples x features)
    # shap_values.base_values is a 1D array (samples)
    
    values = shap_values.values[0]
    base_value = float(shap_values.base_values[0])
    
    for i, feature_name in enumerate(input_features_df.columns):
        contributions.append({
            "feature": feature_name,
            "value": float(values[i])
        })
        
    # Sort by absolute contribution magnitude
    contributions = sorted(contributions, key=lambda x: abs(x["value"]), reverse=True)
    
    return {
        "base_value": base_value,
        "features": contributions
    }

if __name__ == "__main__":
    # Test
    from train_models_v2 import FEATURES
    dummy_input = pd.DataFrame(np.random.rand(1, len(FEATURES)), columns=FEATURES)
    result = get_shap_values(dummy_input, horizon=24)
    print("Base Value:", result["base_value"])
    print("Top 5 Features:")
    for f in result["features"][:5]:
        print(f"  {f['feature']}: {f['value']:.2f}")
