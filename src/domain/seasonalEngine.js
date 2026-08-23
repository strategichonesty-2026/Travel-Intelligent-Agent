const HOME_STATE = 'Minnesota';

const SUMMER_MONTHS = [6, 7, 8];
const WARM_ESCAPE_MONTHS = [11, 12];

const SUMMER_PRIORITY_TAGS = [
  'camping',
  'minnesota-camping',
  'wisconsin-camping',
  'iowa-camping',
  'lakeside',
  'state-park',
  'national-park',
  'road-trip',
  'northern-us',
  'great-lakes',
  'scenic-drive',
  'colorado',
  'niagara-falls',
  'waterfront',
  'hiking',
  'swimming',
  'fishing',
  'outdoor-recreation',
];

const WARM_ESCAPE_PRIORITY_TAGS = [
  'mexico',
  'southern-california',
  'florida',
  'arizona',
  'nevada',
  'warm-resort',
  'warm-road-trip',
];

/**
 * Classifies a travel month into the traveler's seasonal regime.
 * Boundaries come from the traveler's stated preferences, not a generic calendar season.
 */
function classifySeason(month) {
  if (SUMMER_MONTHS.includes(month)) return 'SUMMER_OUTDOOR';
  if (WARM_ESCAPE_MONTHS.includes(month)) return 'WARM_ESCAPE';
  return 'SHOULDER';
}

function monthFromDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.getUTCMonth() + 1;
}

function getSeasonalContext(travelDate) {
  const month = monthFromDate(travelDate);
  const season = classifySeason(month);
  return {
    month,
    season,
    homeState: HOME_STATE,
    priorityTags: season === 'SUMMER_OUTDOOR'
      ? SUMMER_PRIORITY_TAGS
      : season === 'WARM_ESCAPE'
        ? WARM_ESCAPE_PRIORITY_TAGS
        : [],
  };
}

/**
 * Seasonal Fit Score, 0-100.
 *
 * destination: { tags: string[], isColdWeather?: boolean, exceptionalValue?: boolean, seasonalClosure?: boolean }
 * travelDate: Date | ISO string used to derive the applicable season
 *
 * Camping destinations get an explicit boost in SUMMER_OUTDOOR per the traveler's stated
 * preference that camping should be weighted heavily June-August. Cold-weather destinations
 * are penalized in WARM_ESCAPE unless flagged as an exceptional value, per the traveler's
 * instruction not to recommend cold destinations "simply because cheap."
 */
function computeSeasonalFitScore(destination, travelDate) {
  const ctx = getSeasonalContext(travelDate);
  const tags = destination.tags || [];

  if (ctx.season === 'SHOULDER') {
    return { score: 50, season: ctx.season, reason: 'Outside the traveler\'s defined peak seasons (Jun-Aug camping / Nov-Dec warm escape); neutral baseline applied.' };
  }

  const overlap = tags.filter((t) => ctx.priorityTags.includes(t)).length;
  const overlapRatio = ctx.priorityTags.length > 0 ? overlap / Math.min(ctx.priorityTags.length, 6) : 0;
  let score = Math.round(Math.min(1, overlapRatio) * 70) + 20; // 20-90 base range

  if (ctx.season === 'SUMMER_OUTDOOR' && tags.includes('camping')) {
    score = Math.min(100, score + 15);
  }

  if (ctx.season === 'WARM_ESCAPE') {
    if (destination.isColdWeather && !destination.exceptionalValue) {
      score = Math.max(0, score - 40);
    }
    if (!destination.isColdWeather) {
      score = Math.min(100, score + 10);
    }
  }

  if (destination.seasonalClosure) {
    score = Math.max(0, score - 30);
  }

  return { score: Math.max(0, Math.min(100, score)), season: ctx.season, reason: `${overlap} of ${ctx.priorityTags.length} seasonal priority tags matched for ${ctx.season}.` };
}

module.exports = {
  HOME_STATE,
  SUMMER_MONTHS,
  WARM_ESCAPE_MONTHS,
  SUMMER_PRIORITY_TAGS,
  WARM_ESCAPE_PRIORITY_TAGS,
  classifySeason,
  monthFromDate,
  getSeasonalContext,
  computeSeasonalFitScore,
};
