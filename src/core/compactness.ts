// Polsby-Popper compactness for a constituency polygon.
// PP = 4π·area / perimeter²  (1 = perfect circle, < 0.2 = highly fragmented).
// Area/perimeter use an equirectangular approximation at the ring's midpoint latitude.

/** Signed area of a ring via the shoelace formula (degree units; sign only). */
function signedArea(ring: number[][]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return a / 2;
}

export function constituencyCompactness(f: GeoJSON.Feature): { pp: number; areaKm2: number; perimKm: number } {
  let ring: number[][];
  if (f.geometry?.type === 'Polygon') {
    ring = f.geometry.coordinates[0] as unknown as number[][];
  } else if (f.geometry?.type === 'MultiPolygon') {
    let maxArea = -Infinity;
    let biggestPoly: number[][] | undefined;
    for (const poly of f.geometry.coordinates as unknown as number[][][]) {
      const a = Math.abs(signedArea(poly));
      if (a > maxArea) { maxArea = a; biggestPoly = poly; }
    }
    if (!biggestPoly) return { pp: 0, areaKm2: 0, perimKm: 0 };
    ring = biggestPoly;
  } else {
    return { pp: 0, areaKm2: 0, perimKm: 0 };
  }

  const latMid = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(latMid * Math.PI / 180);

  let areaM = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    areaM += (ring[j][0] * mPerDegLng) * (ring[i][1] * mPerDegLat)
           - (ring[i][0] * mPerDegLng) * (ring[j][1] * mPerDegLat);
  }
  areaM = Math.abs(areaM / 2);

  let perimM = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const dx = (ring[i][0] - ring[j][0]) * mPerDegLng;
    const dy = (ring[i][1] - ring[j][1]) * mPerDegLat;
    perimM += Math.sqrt(dx * dx + dy * dy);
  }

  const pp = perimM > 0 ? (4 * Math.PI * areaM) / (perimM * perimM) : 0;
  return { pp, areaKm2: areaM / 1e6, perimKm: perimM / 1000 };
}
