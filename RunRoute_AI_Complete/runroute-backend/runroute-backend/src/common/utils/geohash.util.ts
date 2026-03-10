const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encodeGeohash(lat: number, lng: number, precision = 6): string {
  let idx = 0, bit = 0, evenBit = true, geohash = '';
  let minLat = -90, maxLat = 90, minLng = -180, maxLng = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const midLng = (minLng + maxLng) / 2;
      if (lng >= midLng) { idx = idx * 2 + 1; minLng = midLng; }
      else { idx = idx * 2; maxLng = midLng; }
    } else {
      const midLat = (minLat + maxLat) / 2;
      if (lat >= midLat) { idx = idx * 2 + 1; minLat = midLat; }
      else { idx = idx * 2; maxLat = midLat; }
    }
    evenBit = !evenBit;
    if (++bit === 5) { geohash += BASE32[idx]; bit = 0; idx = 0; }
  }
  return geohash;
}
