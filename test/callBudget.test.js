const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const budget = require('../src/services/callBudget');

beforeEach(budget.resetBudgetForTests);
afterEach(budget.resetBudgetForTests);

test('tryConsumeBudget allows calls up to the max, then blocks', () => {
  assert.equal(budget.tryConsumeBudget('flights', 3).allowed, true);
  assert.equal(budget.tryConsumeBudget('flights', 3).allowed, true);
  assert.equal(budget.tryConsumeBudget('flights', 3).allowed, true);
  const fourth = budget.tryConsumeBudget('flights', 3);
  assert.equal(fourth.allowed, false);
  assert.equal(fourth.remaining, 0);
});

test('a max of 0 denies the very first call of a fresh window (regression: this used to always allow the first call)', () => {
  const first = budget.tryConsumeBudget('flights', 0);
  assert.equal(first.allowed, false);
  assert.equal(first.remaining, 0);
  // Still denied on a second call in the same window, not just the first.
  assert.equal(budget.tryConsumeBudget('flights', 0).allowed, false);
});

test('different providers have independent budgets', () => {
  budget.tryConsumeBudget('flights', 1);
  assert.equal(budget.tryConsumeBudget('flights', 1).allowed, false);
  // hotels budget is untouched by flights being exhausted
  assert.equal(budget.tryConsumeBudget('hotels', 1).allowed, true);
});

test('the budget resets after the window elapses', () => {
  budget.tryConsumeBudget('flights', 1, 50); // 50ms window
  assert.equal(budget.tryConsumeBudget('flights', 1, 50).allowed, false);
  return new Promise((resolve) => {
    setTimeout(() => {
      assert.equal(budget.tryConsumeBudget('flights', 1, 50).allowed, true);
      resolve();
    }, 80);
  });
});

test('getBudgetStatus reports usage without consuming', () => {
  budget.tryConsumeBudget('hotels', 10);
  budget.tryConsumeBudget('hotels', 10);
  const status = budget.getBudgetStatus('hotels', 10);
  assert.equal(status.used, 2);
  assert.equal(status.max, 10);
  assert.ok(status.windowResetAt);
});

test('getBudgetStatus for an untouched provider reports zero usage', () => {
  const status = budget.getBudgetStatus('untouched-provider', 5);
  assert.equal(status.used, 0);
  assert.equal(status.windowResetAt, null);
});
