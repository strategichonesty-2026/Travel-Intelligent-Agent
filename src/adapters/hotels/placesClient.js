/**
 * Thin wrapper around Google Places API (New) — Text Search endpoint, called directly via fetch
 * rather than the official @googlemaps/places SDK: that package is explicitly labeled "preview"
 * (unstable, breaking changes possible) and defaults to heavier service-account/ADC auth, where
 * the plain REST API supports simple API-key auth (X-Goog-Api-Key) that fits this project's
 * single-key-env-var pattern used by every other adapter here. Field/endpoint shape verified
 * directly against Google's current documentation, not assumed from training knowledge.
 */

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.location',
  'places.types',
  'places.websiteUri',
  'places.googleMapsUri',
].join(',');

/**
 * params: { latitude, longitude, radiusMeters, query, pageSize }
 * Returns the raw Places API (New) response body ({ places: [...] }).
 */
async function searchPlaces({ latitude, longitude, radiusMeters = 15000, query = 'hotel', pageSize = 10 }) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY not set');
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      includedType: 'lodging',
      locationBias: { circle: { center: { latitude, longitude }, radius: radiusMeters } },
      pageSize,
    }),
    signal: AbortSignal.timeout(10000),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const detail = body?.error?.message || res.statusText;
    const error = new Error(`Google Places search failed: ${res.status} ${detail}`);
    error.status = res.status;
    error.googleError = body?.error;
    throw error;
  }

  return body;
}

module.exports = { searchPlaces };
