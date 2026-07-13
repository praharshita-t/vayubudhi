import os
import sys
import pickle
import numpy as np

# Add src to python path to import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from forecast import AQIForecaster
from classifier import SourceClassifier
from uncertainty import ConformalWrapper
from validation import (
    calculate_rmse,
    compare_persistence_baseline,
    calculate_js_divergence,
    calculate_wasserstein_distance
)

def generate_synthetic_data(num_samples=1000):
    np.random.seed(42)
    # Generate typical meteorological features
    temp = np.random.uniform(15, 38, size=num_samples)
    humidity = np.random.uniform(20, 90, size=num_samples)
    pressure = np.random.uniform(995, 1015, size=num_samples)
    wind_speed = np.random.uniform(0.5, 12.0, size=num_samples)
    pblh = np.random.uniform(100, 2000, size=num_samples)
    
    # Generate PM values reflecting typical urban conditions
    pm10 = np.random.uniform(30, 350, size=num_samples)
    pm_ratio = np.random.uniform(0.3, 0.9, size=num_samples)
    pm25 = pm10 * pm_ratio
    
    # Stack features: [pm25, pm10, temp, humidity, pressure, wind_speed, pblh]
    X = np.column_stack([pm25, pm10, temp, humidity, pressure, wind_speed, pblh])
    
    # Generate AQI forecast target (future AQI in 24h)
    # Physically grounded: high PM2.5 + low ventilation (stagnant air) = high future AQI
    vi = pblh * wind_speed
    stagnancy = 1.0 / (vi + 1e-5)
    y_reg = pm25 * (1.2 + 500.0 * stagnancy) + np.random.normal(0, 10, size=num_samples)
    y_reg = np.clip(y_reg, 0, 500) # Clip AQI to standard range [0, 500]
    
    # Create dictionary list for weak labels heuristics
    data_list = []
    for i in range(num_samples):
        data_list.append({
            "pm25": pm25[i],
            "pm10": pm10[i],
            "temp": temp[i],
            "humidity": humidity[i],
            "pressure": pressure[i],
            "wind_speed": wind_speed[i],
            "pblh": pblh[i]
        })
        
    return X, y_reg, data_list

def main():
    print("Generating synthetic datasets...")
    X, y_reg, data_list = generate_synthetic_data(1200)
    
    # Split into Train (800), Calib (200), Test (200)
    X_train, y_train_reg, data_train = X[:800], y_reg[:800], data_list[:800]
    X_calib, y_calib_reg, data_calib = X[800:1000], y_reg[800:1000], data_list[800:1000]
    X_test, y_test_reg, data_test = X[1000:], y_reg[1000:], data_list[1000:]
    
    # 1. FORECASTING
    print("\n--- Training Forecast Model (XGBoost) ---")
    forecaster = AQIForecaster(horizon_hours=24)
    forecaster.train(X_train, y_train_reg)
    
    print("Calibrating forecast model conformal intervals with MAPIE...")
    forecaster.conformal_wrapper = ConformalWrapper(forecaster.model, alpha=0.1, is_classifier=False)
    forecaster.conformal_wrapper.calibrate(X_calib, y_calib_reg)
    
    # 2. SOURCE APPORTIONMENT
    print("\n--- Training Source Apportionment Classifier (Random Forest) ---")
    classifier = SourceClassifier()
    # Label source attribution noisy labels using weak heuristics
    y_train_noisy = classifier.apply_weak_heuristics(data_train)
    y_train_noisy_arr = np.array(y_train_noisy)
    classifier.train(X_train, y_train_noisy_arr)
    
    print("Calibrating classifier conformal prediction sets with MAPIE...")
    classifier.conformal_wrapper = ConformalWrapper(classifier.model, alpha=0.1, is_classifier=True)
    y_calib_noisy = classifier.apply_weak_heuristics(data_calib)
    classifier.conformal_wrapper.calibrate(X_calib, np.array(y_calib_noisy))
    
    # 3. OFFLINE VALIDATION
    print("\n--- Running Offline Validation ---")
    y_pred_reg, intervals = forecaster.conformal_wrapper.predict_with_interval(X_test)
    
    # RMSE calculation
    rmse = calculate_rmse(y_pred_reg, y_test_reg)
    # Persistence baseline (predict target is current PM2.5 level)
    baseline_rmse = calculate_rmse(X_test[:, 0].tolist(), y_test_reg.tolist())
    comparison = compare_persistence_baseline(rmse, baseline_rmse)
    
    print(f"XGBoost Model RMSE: {rmse:.4f}")
    print(f"Persistence Baseline RMSE: {baseline_rmse:.4f}")
    print(f"Improvement over Baseline: {comparison['improvement_pct']:.2f}%")
    print(f"Validation Status: {comparison['status'].upper()}")
    
    # Conformal Coverage Verification
    coverage_count = 0
    for val, (low, high) in zip(y_test_reg, intervals):
        if low <= val <= high:
            coverage_count += 1
    coverage = coverage_count / len(y_test_reg)
    print(f"Empirical Conformal Coverage (Target 90%): {coverage*100:.2f}%")
    
    # Statistical distances on classification distribution
    classes = classifier.model.classes_
    y_test_noisy = classifier.apply_weak_heuristics(data_test)
    
    # Let's build target distributions (one-hot) vs predicted probability distributions
    jsd_list = []
    wasserstein_list = []
    
    class_map = {cls: idx for idx, cls in enumerate(classes)}
    for i in range(len(X_test)):
        # One-hot true label
        true_dist = np.zeros(len(classes))
        true_label = y_test_noisy[i]
        true_dist[class_map[true_label]] = 1.0
        
        # Predicted probability
        pred_dict = classifier.predict(data_test[i])
        pred_dist = np.array([pred_dict["probabilities"][cls] for cls in classes])
        
        # Calculate JSD and Wasserstein
        jsd = calculate_js_divergence(pred_dist.tolist(), true_dist.tolist())
        wd = calculate_wasserstein_distance(pred_dist.tolist(), true_dist.tolist())
        jsd_list.append(jsd)
        wasserstein_list.append(wd)
        
    print(f"Average JS-Divergence vs Weak Labels: {np.mean(jsd_list):.4f}")
    print(f"Average Wasserstein Distance vs Weak Labels: {np.mean(wasserstein_list):.4f}")
    
    # 4. SERIALIZATION
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
    os.makedirs(data_dir, exist_ok=True)
    
    forecaster_path = os.path.join(data_dir, "forecaster.pkl")
    classifier_path = os.path.join(data_dir, "classifier.pkl")
    
    print(f"\nSaving model checkpoints to {data_dir}...")
    with open(forecaster_path, "wb") as f:
        pickle.dump(forecaster, f)
    with open(classifier_path, "wb") as f:
        pickle.dump(classifier, f)
        
    print("Success! Models trained, calibrated, validated, and serialized.")

if __name__ == "__main__":
    main()
