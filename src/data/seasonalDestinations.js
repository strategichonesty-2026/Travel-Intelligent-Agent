/**
 * Curated destination catalog used for automatic discovery (spec section 3).
 * These are candidate pools, not live inventory — pricing/availability for any candidate the
 * discovery engine surfaces must still be verified through the relevant adapter before a
 * recommendation can move past RESEARCH_ONLY. Camping-specific candidates in Minnesota,
 * Wisconsin, and Iowa are sourced from data/favoriteCampgrounds.js rather than duplicated here.
 */

const SUMMER_OUTDOOR_DESTINATIONS = [
  {
    id: 'wi-shell-lake',
    name: 'Shell Lake, Wisconsin',
    region: 'Wisconsin',
    tags: ['camping', 'wisconsin-camping', 'lakeside', 'waterfront', 'swimming', 'fishing', 'outdoor-recreation'],
    isColdWeather: false,
  },
  {
    id: 'wi-st-croix-river',
    name: 'St. Croix River area, Wisconsin/Minnesota',
    region: 'Wisconsin/Minnesota',
    tags: ['camping', 'wisconsin-camping', 'minnesota-camping', 'waterfront', 'scenic-drive', 'outdoor-recreation'],
    isColdWeather: false,
  },
  {
    id: 'mn-state-parks',
    name: 'Minnesota State Parks (general)',
    region: 'Minnesota',
    tags: ['camping', 'minnesota-camping', 'state-park', 'hiking', 'lakeside', 'outdoor-recreation'],
    isColdWeather: false,
  },
  {
    id: 'wi-lakes',
    name: 'Wisconsin Lakes (general)',
    region: 'Wisconsin',
    tags: ['camping', 'wisconsin-camping', 'lakeside', 'waterfront', 'fishing', 'swimming'],
    isColdWeather: false,
  },
  {
    id: 'ia-lakes',
    name: 'Iowa Lakes (general — e.g. Iowa Great Lakes/Okoboji)',
    region: 'Iowa',
    tags: ['camping', 'iowa-camping', 'lakeside', 'waterfront', 'fishing', 'swimming'],
    isColdWeather: false,
  },
  {
    id: 'co-rockies',
    name: 'Colorado (Rocky Mountain region)',
    region: 'Colorado',
    tags: ['colorado', 'hiking', 'national-park', 'scenic-drive', 'road-trip', 'northern-us'],
    isColdWeather: false,
  },
  {
    id: 'ny-niagara-falls',
    name: 'Niagara Falls, New York',
    region: 'New York',
    tags: ['niagara-falls', 'scenic-drive', 'northern-us', 'road-trip'],
    isColdWeather: false,
  },
  {
    id: 'great-lakes-region',
    name: 'Great Lakes region (general)',
    region: 'Upper Midwest',
    tags: ['great-lakes', 'northern-us', 'lakeside', 'road-trip', 'scenic-drive'],
    isColdWeather: false,
  },
];

const WARM_ESCAPE_DESTINATIONS = [
  {
    id: 'mx-cancun-riviera-maya',
    name: 'Cancun / Riviera Maya, Mexico',
    region: 'Mexico',
    tags: ['mexico', 'warm-resort'],
    isColdWeather: false,
    hurricaneRiskNote: 'Atlantic hurricane season officially runs through Nov 30 — verify current storm activity before booking.',
  },
  {
    id: 'mx-puerto-vallarta',
    name: 'Puerto Vallarta, Mexico',
    region: 'Mexico',
    tags: ['mexico', 'warm-resort'],
    isColdWeather: false,
  },
  {
    id: 'ca-san-diego',
    name: 'San Diego, Southern California',
    region: 'California',
    tags: ['southern-california', 'warm-road-trip'],
    isColdWeather: false,
  },
  {
    id: 'ca-palm-springs',
    name: 'Palm Springs, Southern California',
    region: 'California',
    tags: ['southern-california', 'warm-resort'],
    isColdWeather: false,
  },
  {
    id: 'fl-orlando',
    name: 'Orlando, Florida',
    region: 'Florida',
    tags: ['florida', 'warm-resort'],
    isColdWeather: false,
  },
  {
    id: 'fl-gulf-coast',
    name: 'Florida Gulf Coast (e.g. Tampa/Sarasota)',
    region: 'Florida',
    tags: ['florida', 'warm-resort'],
    isColdWeather: false,
  },
  {
    id: 'az-phoenix-scottsdale',
    name: 'Phoenix / Scottsdale, Arizona',
    region: 'Arizona',
    tags: ['arizona', 'warm-resort'],
    isColdWeather: false,
  },
  {
    id: 'nv-las-vegas',
    name: 'Las Vegas, Nevada',
    region: 'Nevada',
    tags: ['nevada', 'warm-resort', 'warm-road-trip'],
    isColdWeather: false,
  },
];

module.exports = { SUMMER_OUTDOOR_DESTINATIONS, WARM_ESCAPE_DESTINATIONS };
