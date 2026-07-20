/**
 * Convert OSM Overpass "out geom" relation data into simplified GeoJSON polygons
 * for each Delhi district. Outputs delhiDistrictsGeo.json.
 */
const fs = require('fs');
const path = require('path');

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'osm_districts_raw.json'), 'utf-8'));

function buildPolygon(members) {
  // Collect all "outer" way segments
  const outerWays = members.filter(m => m.type === 'way' && m.role === 'outer');
  
  if (outerWays.length === 0) return null;
  
  // Build coordinate arrays from each way's geometry
  const segments = outerWays.map(w => w.geometry.map(pt => [pt.lon, pt.lat]));
  
  // Stitch segments together into closed rings
  const rings = [];
  const used = new Set();
  
  while (used.size < segments.length) {
    let ring = null;
    
    for (let i = 0; i < segments.length; i++) {
      if (used.has(i)) continue;
      
      if (!ring) {
        ring = [...segments[i]];
        used.add(i);
        continue;
      }
      
      const ringEnd = ring[ring.length - 1];
      const segStart = segments[i][0];
      const segEnd = segments[i][segments[i].length - 1];
      
      const threshold = 0.0001;
      
      if (Math.abs(ringEnd[0] - segStart[0]) < threshold && Math.abs(ringEnd[1] - segStart[1]) < threshold) {
        ring.push(...segments[i].slice(1));
        used.add(i);
        i = -1; // restart search
      } else if (Math.abs(ringEnd[0] - segEnd[0]) < threshold && Math.abs(ringEnd[1] - segEnd[1]) < threshold) {
        ring.push(...[...segments[i]].reverse().slice(1));
        used.add(i);
        i = -1;
      }
    }
    
    if (ring) rings.push(ring);
  }
  
  // Return the largest ring (main boundary)
  if (rings.length === 0) return null;
  rings.sort((a, b) => b.length - a.length);
  
  // Ensure ring is closed
  const main = rings[0];
  if (main[0][0] !== main[main.length-1][0] || main[0][1] !== main[main.length-1][1]) {
    main.push(main[0]);
  }
  
  return main;
}

function simplifyRing(ring, tolerance) {
  // Douglas-Peucker simplification
  if (ring.length <= 3) return ring;
  
  let maxDist = 0;
  let maxIdx = 0;
  
  const start = ring[0];
  const end = ring[ring.length - 1];
  
  for (let i = 1; i < ring.length - 1; i++) {
    const d = pointLineDistance(ring[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }
  
  if (maxDist > tolerance) {
    const left = simplifyRing(ring.slice(0, maxIdx + 1), tolerance);
    const right = simplifyRing(ring.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  
  return [start, end];
}

function pointLineDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return Math.sqrt((point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2);
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (len * len)));
  const projX = start[0] + t * dx;
  const projY = start[1] + t * dy;
  return Math.sqrt((point[0] - projX) ** 2 + (point[1] - projY) ** 2);
}

function computeCentroid(ring) {
  let cx = 0, cy = 0;
  for (const [lon, lat] of ring) {
    cx += lon;
    cy += lat;
  }
  return [+(cx / ring.length).toFixed(6), +(cy / ring.length).toFixed(6)];
}

// Process each relation
const districts = [];
const tolerance = 0.001; // ~100m simplification

for (const el of raw.elements) {
  if (el.type !== 'relation') continue;
  
  const name = el.tags.name || el.tags['name:en'] || 'Unknown';
  const polygon = buildPolygon(el.members);
  
  if (!polygon) {
    console.error(`Failed to build polygon for: ${name}`);
    continue;
  }
  
  // Simplify to reduce size
  const simplified = simplifyRing(polygon, tolerance);
  
  // Round coordinates to 4 decimal places
  const rounded = simplified.map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);
  
  const centroid = computeCentroid(rounded);
  
  districts.push({
    id: name.replace(/\s+/g, '_').replace('Delhi', '').replace(/_$/, '').replace(/^_/, '') || 'Delhi',
    name: name,
    polygon: rounded,
    centroid: centroid,
  });
  
  console.log(`${name}: ${polygon.length} pts → ${rounded.length} pts`);
}

// Sort alphabetically
districts.sort((a, b) => a.name.localeCompare(b.name));

const output = JSON.stringify(districts, null, 2);
fs.writeFileSync(path.join(__dirname, 'delhiDistrictsGeo.json'), output);
console.log(`\nWrote ${districts.length} districts to delhiDistrictsGeo.json (${(output.length / 1024).toFixed(1)} KB)`);
