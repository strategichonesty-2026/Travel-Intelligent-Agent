const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classifySeason, computeSeasonalFitScore } = require('../src/domain/seasonalEngine');

test('classifies June-August as SUMMER_OUTDOOR', () => {
  assert.equal(classifySeason(6), 'SUMMER_OUTDOOR');
  assert.equal(classifySeason(7), 'SUMMER_OUTDOOR');
  assert.equal(classifySeason(8), 'SUMMER_OUTDOOR');
});

test('classifies November-December as WARM_ESCAPE', () => {
  assert.equal(classifySeason(11), 'WARM_ESCAPE');
  assert.equal(classifySeason(12), 'WARM_ESCAPE');
});

test('classifies other months as SHOULDER', () => {
  assert.equal(classifySeason(3), 'SHOULDER');
});

test('camping destination gets a boost in summer', () => {
  const camping = { tags: ['camping', 'lakeside', 'waterfront'] };
  const nonCamping = { tags: ['museum', 'city-tour'] };
  const campingScore = computeSeasonalFitScore(camping, '2026-07-15');
  const nonCampingScore = computeSeasonalFitScore(nonCamping, '2026-07-15');
  assert.ok(campingScore.score > nonCampingScore.score);
});

test('cold-weather destination is penalized in Nov-Dec unless exceptional value', () => {
  const cold = { tags: [], isColdWeather: true };
  const coldButExceptional = { tags: [], isColdWeather: true, exceptionalValue: true };
  const coldScore = computeSeasonalFitScore(cold, '2026-11-25');
  const exceptionalScore = computeSeasonalFitScore(coldButExceptional, '2026-11-25');
  assert.ok(exceptionalScore.score > coldScore.score);
});

test('warm destination is boosted in Nov-Dec', () => {
  const warm = { tags: ['florida', 'warm-resort'], isColdWeather: false };
  const score = computeSeasonalFitScore(warm, '2026-12-01');
  const coldControl = computeSeasonalFitScore({ tags: [], isColdWeather: true }, '2026-12-01');
  assert.ok(score.score > coldControl.score);
  assert.ok(score.score >= 50);
  assert.equal(score.season, 'WARM_ESCAPE');
});

test('seasonal closure lowers score', () => {
  const base = { tags: ['camping'] };
  const closed = { tags: ['camping'], seasonalClosure: true };
  const baseScore = computeSeasonalFitScore(base, '2026-07-01');
  const closedScore = computeSeasonalFitScore(closed, '2026-07-01');
  assert.ok(closedScore.score < baseScore.score);
});
