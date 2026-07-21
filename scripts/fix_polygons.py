import json
import math
import os

def sort_points_radially(points, centroid):
    cx, cy = centroid
    def angle(pt):
        return math.atan2(pt[1] - cy, pt[0] - cx)
    return sorted(points, key=angle)

def fix_file(filepath):
    if not os.path.exists(filepath):
        print(f"File {filepath} not found.")
        return
        
    with open(filepath, 'r') as f:
        data = json.load(f)
        
    for district in data:
        centroid = district['centroid']
        district['polygon'] = sort_points_radially(district['polygon'], centroid)
        
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)
        
if __name__ == "__main__":
    out_dir = r"C:\Users\Sai Koushik\Desktop\ET_Hackathon\vayubudhi\frontend\src\data"
    fix_file(os.path.join(out_dir, "hyderabadDistrictsGeo.json"))
    fix_file(os.path.join(out_dir, "guwahatiDistrictsGeo.json"))
    print("Fixed polygon self-intersections.")
