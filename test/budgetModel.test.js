const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classifyBudget, BUDGET_STATUS } = require('../src/domain/budgetModel');

const BUDGET = {
  preferred: { min: 1000, max: 2000 },
  stretch: { enabled: true, max: 3500 },
  absoluteMax: 5000,
};

test('classifyBudget returns UNVERIFIED for a null/non-numeric total cost', () => {
  assert.equal(classifyBudget(null, BUDGET).status, BUDGET_STATUS.UNVERIFIED);
  assert.equal(classifyBudget(undefined, BUDGET).status, BUDGET_STATUS.UNVERIFIED);
  assert.equal(classifyBudget(NaN, BUDGET).status, BUDGET_STATUS.UNVERIFIED);
});

test('classifyBudget flags a cost below preferred.min as EXCEPTIONAL_VALUE', () => {
  assert.equal(classifyBudget(462, BUDGET).status, BUDGET_STATUS.EXCEPTIONAL_VALUE);
});

test('classifyBudget flags a cost inside the preferred range as WITHIN_PREFERRED', () => {
  assert.equal(classifyBudget(1500, BUDGET).status, BUDGET_STATUS.WITHIN_PREFERRED);
  assert.equal(classifyBudget(1000, BUDGET).status, BUDGET_STATUS.WITHIN_PREFERRED);
  assert.equal(classifyBudget(2000, BUDGET).status, BUDGET_STATUS.WITHIN_PREFERRED);
});

test('classifyBudget flags a cost above preferred but within stretch as STRETCH_BUDGET', () => {
  assert.equal(classifyBudget(2800, BUDGET).status, BUDGET_STATUS.STRETCH_BUDGET);
});

test('classifyBudget never returns STRETCH_BUDGET when stretch is disabled', () => {
  const noStretch = { ...BUDGET, stretch: { enabled: false, max: 3500 } };
  const result = classifyBudget(2800, noStretch);
  assert.notEqual(result.status, BUDGET_STATUS.STRETCH_BUDGET);
});

test('classifyBudget flags a cost above absoluteMax as OVER_BUDGET, never Recommended', () => {
  assert.equal(classifyBudget(5001, BUDGET).status, BUDGET_STATUS.OVER_BUDGET);
  assert.equal(classifyBudget(50000, BUDGET).status, BUDGET_STATUS.OVER_BUDGET);
});

test('classifyBudget distinguishes AT_MAXIMUM from PREMIUM_VALUE between stretch and absoluteMax', () => {
  // Between stretch.max (3500) and absoluteMax (5000): near the ceiling should read AT_MAXIMUM,
  // further below it should read PREMIUM_VALUE — exact cutover is a documented judgment call.
  const nearCeiling = classifyBudget(4900, BUDGET);
  const midRange = classifyBudget(3700, BUDGET);
  assert.equal(nearCeiling.status, BUDGET_STATUS.AT_MAXIMUM);
  assert.equal(midRange.status, BUDGET_STATUS.PREMIUM_VALUE);
});
