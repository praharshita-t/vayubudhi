import requests
import json
import os
import time

def fetch_nominatim_polygon(query):
    print(f"Fetching Nominatim geometry for {query}...")
    # Nominatim requires a user agent
    headers = {'User-Agent': 'VayubudhiHackathonApp/1.0'}
    url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json&polygon_geojson=1&limit=1"
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Failed to fetch {query}: {response.status_code}")
        return None
        
    data = response.json()
    if not data:
        print(f"No results for {query}")
        return None
        
    result = data[0]
    geojson = result.get('geojson', {})
    
    if geojson.get('type') == 'Polygon':
        polygon = geojson['coordinates'][0] # Outer ring
    elif geojson.get('type') == 'MultiPolygon':
        # Just take the largest polygon from the multipolygon
        largest = max(geojson['coordinates'], key=lambda p: len(p[0]))
        polygon = largest[0]
    else:
        print(f"Unsupported geometry type for {query}")
        return None
        
    # Calculate centroid
    lons = [p[0] for p in polygon]
    lats = [p[1] for p in polygon]
    centroid = [sum(lons)/len(lons), sum(lats)/len(lats)]
    
    return {
        "id": str(result.get('osm_id', '0')),
        "name": query.split(',')[0],
        "centroid": centroid,
        "polygon": polygon
    }

if __name__ == "__main__":
    # Explicitly query the known major districts for clean UI
    hyderabad_queries = [
        "Hyderabad District, Telangana, India",
        "Medchal-Malkajgiri, Telangana, India",
        "Ranga Reddy, Telangana, India",
        "Sangareddy, Telangana, India"
    ]
    
    guwahati_queries = [
        "Kamrup Metropolitan, Assam, India",
        "Kamrup, Assam, India",
        "Morigaon, Assam, India"
    ]
    
    hyderabad_districts = []
    for q in hyderabad_queries:
        res = fetch_nominatim_polygon(q)
        if res: hyderabad_districts.append(res)
        time.sleep(1) # Respect Nominatim rate limits (1 req/s)
        
    guwahati_districts = []
    for q in guwahati_queries:
        res = fetch_nominatim_polygon(q)
        if res: guwahati_districts.append(res)
        time.sleep(1)
        
    out_dir = r"C:\Users\Sai Koushik\Desktop\ET_Hackathon\vayubudhi\frontend\src\data"
    
    with open(os.path.join(out_dir, "hyderabadDistrictsGeo.json"), "w") as f:
        json.dump(hyderabad_districts, f, indent=2)
        
    with open(os.path.join(out_dir, "guwahatiDistrictsGeo.json"), "w") as f:
        json.dump(guwahati_districts, f, indent=2)
        
    print("Clean Nominatim GeoJSON boundary files updated successfully.")
