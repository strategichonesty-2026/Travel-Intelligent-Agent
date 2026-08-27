/**
 * Maps one raw Google Places API (New) place result into this app's normalized LodgingOption
 * shape. Pure and defensive — falls back to null rather than guessing on a missing field.
 *
 * Important honesty note: Google Places has NO pricing, availability, fee, or cancellation-policy
 * data at all — it is a places/business-info API, not a hotel-rate API. `priceLevel` is a rough
 * $/$$/$$$/$$$$ indicator Google assigns, not a real quoted rate, and is surfaced labeled as such,
 * never as a nightly rate or total cost.
 */

function mapPlaceResult(place) {
  return {
    placeId: place.id ?? null,
    name: place.displayName?.text ?? null,
    address: place.formattedAddress ?? null,
    rating: typeof place.rating === 'number' ? place.rating : null,
    reviewCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    priceLevel: place.priceLevel ?? null, // e.g. "PRICE_LEVEL_MODERATE" — a rough indicator, not a rate
    location: place.location ? { latitude: place.location.latitude, longitude: place.location.longitude } : null,
    types: place.types ?? [],
    websiteUri: place.websiteUri ?? null,
    googleMapsUri: place.googleMapsUri ?? null,
  };
}

module.exports = { mapPlaceResult };
