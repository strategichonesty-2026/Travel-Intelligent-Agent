/**
 * Maps one raw Duffel Offer (see @duffel/api's OfferTypes.d.ts — the shipped SDK type
 * definitions were read directly to get these field names exactly right, since Duffel's own
 * public docs pages were incomplete on some response details) into this app's normalized
 * FlightOption shape. Pure and defensive: every field is read with optional chaining and falls
 * back to null rather than throwing or guessing when a field isn't present — matches this
 * codebase's rule of surfacing UNVERIFIED over fabricating a plausible-looking value.
 *
 * departure.localTime / arrival.localTime are exactly what Duffel returns in `departing_at` /
 * `arriving_at` — already local time at that specific airport (not UTC, not the origin airport's
 * time). departure.timeZone / arrival.timeZone carry the airport's real IANA timezone name
 * (Duffel's Airport.time_zone) so a caller can format/label the time correctly without guessing
 * or assuming every leg shares one timezone.
 */

function parseMoney(str) {
  if (str == null) return null;
  const n = Number(str);
  return Number.isNaN(n) ? null : n;
}

function parseIsoDurationHours(iso) {
  if (!iso) return null;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(iso);
  if (!match) return null;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  return Math.round((hours + minutes / 60) * 100) / 100;
}

function mapAirportSide(segment, side) {
  const place = segment[side]; // Airport
  const at = side === 'origin' ? segment.departing_at : segment.arriving_at;
  const terminal = side === 'origin' ? segment.origin_terminal : segment.destination_terminal;
  return {
    airportCode: place?.iata_code ?? null,
    localTime: at ?? null,
    terminal: terminal ?? null,
    timeZone: place?.time_zone ?? null,
    // Real airport coordinates from Duffel's own Airport object — reused by dealBoard.js to
    // anchor a Google Places hotel search near the actual destination, rather than maintaining a
    // separate, potentially-imprecise set of hardcoded city coordinates (Phase 4).
    latitude: typeof place?.latitude === 'number' ? place.latitude : null,
    longitude: typeof place?.longitude === 'number' ? place.longitude : null,
  };
}

function mapSegment(segment) {
  const carrierCode = segment.marketing_carrier?.iata_code ?? segment.operating_carrier?.iata_code ?? null;
  const flightNumber = segment.marketing_carrier_flight_number ?? null;
  const firstPassenger = segment.passengers?.[0];
  const checkedBag = firstPassenger?.baggages?.find((b) => b.type === 'checked');

  return {
    carrierCode,
    airlineName: segment.marketing_carrier?.name ?? null,
    flightNumber: carrierCode && flightNumber ? `${carrierCode}${flightNumber}` : flightNumber,
    aircraftCode: segment.aircraft?.iata_code ?? null,
    aircraftName: segment.aircraft?.name ?? null,
    departure: mapAirportSide(segment, 'origin'),
    arrival: mapAirportSide(segment, 'destination'),
    cabinClass: firstPassenger?.cabin_class ?? null,
    checkedBagsIncluded: checkedBag?.quantity ?? null,
    technicalStops: (segment.stops || []).length,
  };
}

function mapSlice(slice) {
  const segments = (slice.segments || []).map(mapSegment);
  return {
    durationIso: slice.duration ?? null,
    durationHours: parseIsoDurationHours(slice.duration),
    stops: Math.max(0, segments.length - 1),
    segments,
  };
}

function mapFlightOffer(rawOffer) {
  return {
    offerId: rawOffer.id ?? null,
    source: 'Duffel',
    currency: rawOffer.total_currency ?? null,
    basePrice: parseMoney(rawOffer.base_amount),
    totalPrice: parseMoney(rawOffer.total_amount),
    expiresAt: rawOffer.expires_at ?? null,
    liveMode: rawOffer.live_mode ?? null,
    owningAirline: rawOffer.owner ? { code: rawOffer.owner.iata_code ?? null, name: rawOffer.owner.name ?? null } : null,
    // Duffel calls slices what most of this codebase calls "itineraries" (outbound/return legs).
    itineraries: (rawOffer.slices || []).map(mapSlice),
  };
}

module.exports = { mapFlightOffer, parseIsoDurationHours, parseMoney };
