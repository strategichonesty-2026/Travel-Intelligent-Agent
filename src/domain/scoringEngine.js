const DEFAULT_TRIP_WEIGHTS = Object.freeze({
  totalCost: 0.20,
  flightCompatibility: 0.15,
  lodgingValue: 0.15,
  location: 0.10,
  activities: 0.10,
  transportation: 0.05,
  flexibility: 0.05,
  evidenceConfidence: 0.10,
  seasonalFit: 0.10,
});

// As specified by the traveler: these sum to 0.80, not 1.0. computeWeightedScore()
// normalizes by the sum of weights actually supplied, so the result is always a 0-100
// score regardless of whether the raw weights total exactly 1.
const DEFAULT_CAMPING_WEIGHTS = Object.freeze({
  hookupQuality: 0.15,
  bathhouseQuality: 0.15,
  cost: 0.15,
  drivingConvenience: 0.10,
  recreation: 0.10,
  siteQuality: 0.05,
  reservationFlexibility: 0.05,
  evidenceConfidence: 0.05,
});

function validateWeights(weights) {
  for (const [key, value] of Object.entries(weights)) {
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
      throw new Error(`Invalid weight for "${key}": must be a non-negative number`);
    }
  }
  return weights;
}

/**
 * scores: { [criterionKey]: number } each 0-100
 * weights: { [criterionKey]: number } — need not sum to 1; normalized here
 * Returns a 0-100 composite score plus a per-criterion contribution breakdown.
 */
function computeWeightedScore(scores, weights) {
  validateWeights(weights);
  const keys = Object.keys(weights).filter((k) => Object.prototype.hasOwnProperty.call(scores, k));
  const weightSum = keys.reduce((sum, k) => sum + weights[k], 0);

  if (weightSum === 0) {
    return { total: 0, breakdown: {} };
  }

  const breakdown = {};
  let total = 0;
  for (const key of keys) {
    const normalizedWeight = weights[key] / weightSum;
    const contribution = scores[key] * normalizedWeight;
    breakdown[key] = { score: scores[key], weight: weights[key], normalizedWeight, contribution };
    total += contribution;
  }

  return { total: Math.round(total * 100) / 100, breakdown };
}

function mergeWeights(base, overrides = {}) {
  const merged = { ...base, ...overrides };
  return validateWeights(merged);
}

module.exports = {
  DEFAULT_TRIP_WEIGHTS,
  DEFAULT_CAMPING_WEIGHTS,
  validateWeights,
  computeWeightedScore,
  mergeWeights,
};
