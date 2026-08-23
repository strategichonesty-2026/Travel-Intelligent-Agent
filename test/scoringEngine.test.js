const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_TRIP_WEIGHTS, DEFAULT_CAMPING_WEIGHTS, computeWeightedScore, mergeWeights, validateWeights } = require('../src/domain/scoringEngine');

test('default trip weights sum to 1.0', () => {
  const sum = Object.values(DEFAULT_TRIP_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
});

test('computeWeightedScore returns 100 when all scores are 100', () => {
  const scores = Object.fromEntries(Object.keys(DEFAULT_TRIP_WEIGHTS).map((k) => [k, 100]));
  const { total } = computeWeightedScore(scores, DEFAULT_TRIP_WEIGHTS);
  assert.equal(total, 100);
});

test('computeWeightedScore normalizes camping weights even though spec weights sum to 0.80', () => {
  const sum = Object.values(DEFAULT_CAMPING_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 0.8) < 1e-9);

  const scores = Object.fromEntries(Object.keys(DEFAULT_CAMPING_WEIGHTS).map((k) => [k, 100]));
  const { total } = computeWeightedScore(scores, DEFAULT_CAMPING_WEIGHTS);
  assert.equal(total, 100);
});

test('computeWeightedScore only uses weights for scores actually supplied', () => {
  const { total, breakdown } = computeWeightedScore({ totalCost: 100 }, DEFAULT_TRIP_WEIGHTS);
  assert.equal(total, 100);
  assert.equal(Object.keys(breakdown).length, 1);
});

test('mergeWeights overrides only the given keys', () => {
  const merged = mergeWeights(DEFAULT_TRIP_WEIGHTS, { totalCost: 0.5 });
  assert.equal(merged.totalCost, 0.5);
  assert.equal(merged.flightCompatibility, DEFAULT_TRIP_WEIGHTS.flightCompatibility);
});

test('validateWeights rejects negative weights', () => {
  assert.throws(() => validateWeights({ totalCost: -1 }));
});
