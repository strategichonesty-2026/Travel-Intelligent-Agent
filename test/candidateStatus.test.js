const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CANDIDATE_STATUS, deriveCandidateStatus } = require('../src/domain/candidateStatus');

const base = {
  budgetStatus: 'WITHIN_PREFERRED',
  travelTimeStatus: 'PREFERRED',
  qualificationVerdict: 'QUALIFIED',
  hasRealCost: true,
  hasRealTravelTime: true,
};

test('deriveCandidateStatus: a hard-failed qualification is always EXCLUDED, even with great budget/time', () => {
  const status = deriveCandidateStatus({ ...base, qualificationVerdict: 'CONDITIONAL_FAILED' });
  assert.equal(status, CANDIDATE_STATUS.EXCLUDED);
});

test('deriveCandidateStatus: over the absolute budget max is EXCLUDED regardless of everything else', () => {
  const status = deriveCandidateStatus({ ...base, budgetStatus: 'OVER_BUDGET' });
  assert.equal(status, CANDIDATE_STATUS.EXCLUDED);
});

test('deriveCandidateStatus: past the absolute travel-time max is EXCLUDED', () => {
  const status = deriveCandidateStatus({ ...base, travelTimeStatus: 'EXCLUDED' });
  assert.equal(status, CANDIDATE_STATUS.EXCLUDED);
});

test('deriveCandidateStatus: missing real cost or travel-time data is UNVERIFIED, never guessed', () => {
  assert.equal(deriveCandidateStatus({ ...base, hasRealCost: false }), CANDIDATE_STATUS.UNVERIFIED);
  assert.equal(deriveCandidateStatus({ ...base, hasRealTravelTime: false }), CANDIDATE_STATUS.UNVERIFIED);
});

test('deriveCandidateStatus: within-preferred budget + preferred travel time + qualified is RECOMMENDED', () => {
  assert.equal(deriveCandidateStatus(base), CANDIDATE_STATUS.RECOMMENDED);
});

test('deriveCandidateStatus: stretch-tier budget demotes an otherwise-good candidate to STRETCH', () => {
  const status = deriveCandidateStatus({ ...base, budgetStatus: 'STRETCH_BUDGET' });
  assert.equal(status, CANDIDATE_STATUS.STRETCH);
});

test('deriveCandidateStatus: stretch-tier travel time demotes an otherwise-good candidate to STRETCH', () => {
  const status = deriveCandidateStatus({ ...base, travelTimeStatus: 'STRETCH_TRAVEL_TIME' });
  assert.equal(status, CANDIDATE_STATUS.STRETCH);
});

test('deriveCandidateStatus: good budget/time but unresolved qualification lands on VALIDATED, not RECOMMENDED', () => {
  const status = deriveCandidateStatus({ ...base, qualificationVerdict: 'INSUFFICIENT_EVIDENCE' });
  assert.equal(status, CANDIDATE_STATUS.VALIDATED);
});

test('deriveCandidateStatus: long (but not excluded) travel time with good budget lands on VALIDATED', () => {
  const status = deriveCandidateStatus({ ...base, travelTimeStatus: 'LONG_TRAVEL_TIME' });
  assert.equal(status, CANDIDATE_STATUS.VALIDATED);
});

test('deriveCandidateStatus: qualificationVerdict null (non-camping) does not block RECOMMENDED on its own', () => {
  const status = deriveCandidateStatus({ ...base, qualificationVerdict: null });
  assert.equal(status, CANDIDATE_STATUS.RECOMMENDED);
});
