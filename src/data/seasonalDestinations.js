/**
 * Curated destination catalog used for automatic discovery (spec section 3).
 * These are candidate pools, not live inventory — pricing/availability for any candidate the
 * discovery engine surfaces must still be verified through the relevant adapter before a
 * recommendation can move past RESEARCH_ONLY. Camping-specific candidates in Minnesota,
 * Wisconsin, and Iowa are sourced from data/favoriteCampgrounds.js rather than duplicated here.
 *
 * airportCode: the nearest major commercial airport's real IATA code, used by
 * src/adapters/flights/flightsAdapter.js (Phase 3) to search live flights. null where a "region"
 * entry is too vague to map to one airport (e.g. "Great Lakes region (general)") — those stay
 * flight-search-ineligible rather than guessing an airport.
 */

const SUMMER_OUTDOOR_DESTINATIONS = [
  {
    id: 'wi-shell-lake',
    name: 'Shell Lake, Wisconsin',
    region: 'Wisconsin',
    category: 'camping',
    tags: ['camping', 'wisconsin-camping', 'lakeside', 'waterfront', 'swimming', 'fishing', 'outdoor-recreation'],
    isColdWeather: false,
  },
  {
    id: 'wi-st-croix-river',
    name: 'St. Croix River area, Wisconsin/Minnesota',
    region: 'Wisconsin/Minnesota',
    category: 'camping',
    tags: ['camping', 'wisconsin-camping', 'minnesota-camping', 'waterfront', 'scenic-drive', 'outdoor-recreation'],
    isColdWeather: false,
  },
  {
    id: 'mn-state-parks',
    name: 'Minnesota State Parks (general)',
    region: 'Minnesota',
    category: 'camping',
    tags: ['camping', 'minnesota-camping', 'state-park', 'hiking', 'lakeside', 'outdoor-recreation'],
    isColdWeather: false,
  },
  {
    id: 'wi-lakes',
    name: 'Wisconsin Lakes (general)',
    region: 'Wisconsin',
    category: 'camping',
    tags: ['camping', 'wisconsin-camping', 'lakeside', 'waterfront', 'fishing', 'swimming'],
    isColdWeather: false,
  },
  {
    id: 'ia-lakes',
    name: 'Iowa Lakes (general — e.g. Iowa Great Lakes/Okoboji)',
    region: 'Iowa',
    category: 'camping',
    tags: ['camping', 'iowa-camping', 'lakeside', 'waterfront', 'fishing', 'swimming'],
    isColdWeather: false,
  },
  {
    id: 'co-rockies',
    name: 'Colorado (Rocky Mountain region)',
    region: 'Colorado',
    category: 'colorado',
    tags: ['colorado', 'hiking', 'national-park', 'scenic-drive', 'road-trip', 'northern-us'],
    isColdWeather: false,
    airportCode: 'DEN',
  },
  {
    id: 'ny-niagara-falls',
    name: 'Niagara Falls, New York',
    region: 'New York',
    category: 'niagara',
    tags: ['niagara-falls', 'scenic-drive', 'northern-us', 'road-trip'],
    isColdWeather: false,
    airportCode: 'BUF', // Buffalo Niagara Intl — nearest commercial airport with regular service
  },
  {
    id: 'great-lakes-region',
    name: 'Great Lakes region (general)',
    region: 'Upper Midwest',
    category: 'niagara',
    tags: ['great-lakes', 'northern-us', 'lakeside', 'road-trip', 'scenic-drive'],
    isColdWeather: false,
    airportCode: null, // too vague a "region" to name one airport — flight-search-ineligible
  },
];

const WARM_ESCAPE_DESTINATIONS = [
  {
    id: 'mx-cancun-riviera-maya',
    name: 'Cancun / Riviera Maya, Mexico',
    region: 'Mexico',
    category: 'mexico',
    tags: ['mexico', 'warm-resort'],
    isColdWeather: false,
    airportCode: 'CUN',
    hurricaneRiskNote: 'Atlantic hurricane season officially runs through Nov 30 — verify current storm activity before booking.',
  },
  {
    id: 'mx-puerto-vallarta',
    name: 'Puerto Vallarta, Mexico',
    region: 'Mexico',
    category: 'mexico',
    tags: ['mexico', 'warm-resort'],
    isColdWeather: false,
    airportCode: 'PVR',
  },
  {
    id: 'ca-san-diego',
    name: 'San Diego, Southern California',
    region: 'California',
    category: 'socal',
    tags: ['southern-california', 'warm-road-trip'],
    isColdWeather: false,
    airportCode: 'SAN',
  },
  {
    id: 'ca-palm-springs',
    name: 'Palm Springs, Southern California',
    region: 'California',
    category: 'socal',
    tags: ['southern-california', 'warm-resort'],
    isColdWeather: false,
    airportCode: 'PSP',
  },
  {
    id: 'fl-orlando',
    name: 'Orlando, Florida',
    region: 'Florida',
    category: 'florida',
    tags: ['florida', 'warm-resort'],
    isColdWeather: false,
    airportCode: 'MCO',
  },
  {
    id: 'fl-gulf-coast',
    name: 'Florida Gulf Coast (e.g. Tampa/Sarasota)',
    region: 'Florida',
    category: 'florida',
    tags: ['florida', 'warm-resort'],
    isColdWeather: false,
    airportCode: 'TPA',
  },
  {
    id: 'az-phoenix-scottsdale',
    name: 'Phoenix / Scottsdale, Arizona',
    region: 'Arizona',
    category: 'southwest',
    tags: ['arizona', 'warm-resort'],
    isColdWeather: false,
    airportCode: 'PHX',
  },
  {
    id: 'nv-las-vegas',
    name: 'Las Vegas, Nevada',
    region: 'Nevada',
    category: 'southwest',
    tags: ['nevada', 'warm-resort', 'warm-road-trip'],
    isColdWeather: false,
    airportCode: 'LAS',
  },
];

/**
 * Spec section 4 lists "cruise line" as an official-booking category, but nothing in the spec
 * defines cruise-specific research/scoring, and no cruise line data has been researched yet.
 * Left empty deliberately rather than inventing itineraries/pricing — see the dashboard's
 * Cruise tab for the honest not-yet-built state.
 */
const CRUISE_DESTINATIONS = [];

module.exports = { SUMMER_OUTDOOR_DESTINATIONS, WARM_ESCAPE_DESTINATIONS, CRUISE_DESTINATIONS };
