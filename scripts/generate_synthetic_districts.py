import json
import os

def create_geojson_grid(city_name, min_lat, max_lat, min_lon, max_lon, rows=5, cols=5):
    features = []
    lat_step = (max_lat - min_lat) / rows
    lon_step = (max_lon - min_lon) / cols
    
    zone_num = 1
    for r in range(rows):
        for c in range(cols):
            lat0 = min_lat + r * lat_step
            lat1 = min_lat + (r + 1) * lat_step
            lon0 = min_lon + c * lon_step
            lon1 = min_lon + (c + 1) * lon_step
            
            # GeoJSON polygons need 5 points, closing loop
            poly = [
                [lon0, lat0],
                [lon1, lat0],
                [lon1, lat1],
                [lon0, lat1],
                [lon0, lat0]
            ]
            
            centroid = [(lon0 + lon1) / 2, (lat0 + lat1) / 2]
            
            features.append({
                "id": str(zone_num),
                "name": f"{city_name} Zone {zone_num}",
                "centroid": centroid,
                "polygon": poly
            })
            zone_num += 1
            
    return features

if __name__ == "__main__":
    # Hyderabad known CAAQMS bounding box with small padding (~5km)
    hyd_min_lat, hyd_max_lat = 17.30, 17.48
    hyd_min_lon, hyd_max_lon = 78.40, 78.62
    
    # Guwahati known CAAQMS bounding box with small padding (~5km)
    guw_min_lat, guw_max_lat = 26.10, 26.22
    guw_min_lon, guw_max_lon = 91.70, 91.85
    
    # Generate 5x5 grids (25 perfectly adjacent sub-districts for each city)
    hyd_grid = create_geojson_grid("Hyderabad", hyd_min_lat, hyd_max_lat, hyd_min_lon, hyd_max_lon, 5, 5)
    guw_grid = create_geojson_grid("Guwahati", guw_min_lat, guw_max_lat, guw_min_lon, guw_max_lon, 5, 5)
    
    out_dir = r"C:\Users\Sai Koushik\Desktop\ET_Hackathon\vayubudhi\frontend\src\data"
    os.makedirs(out_dir, exist_ok=True)
    
    with open(os.path.join(out_dir, "hyderabadDistrictsGeo.json"), "w") as f:
        json.dump(hyd_grid, f, indent=2)
        
    with open(os.path.join(out_dir, "guwahatiDistrictsGeo.json"), "w") as f:
        json.dump(guw_grid, f, indent=2)
        
    print("Synthetic grids generated and saved.")
