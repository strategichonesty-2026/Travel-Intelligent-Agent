const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const outdoorsyAdapter = require('../src/adapters/outdoorsy/outdoorsyAdapter');

let originalId;

beforeEach(() => {
  originalId = process.env.ODC_PARTNER_ID;
});

afterEach(() => {
  if (originalId === undefined) delete process.env.ODC_PARTNER_ID;
  else process.env.ODC_PARTNER_ID = originalId;
});

test('isConfigured/searchRvRentals: no fabricated data when ODC_PARTNER_ID is unset', async () => {
  delete process.env.ODC_PARTNER_ID;
  assert.equal(outdoorsyAdapter.isConfigured(), false);

  const result = await outdoorsyAdapter.searchRvRentals();
  assert.equal(result.configured, false);
  assert.deepEqual(result.results, []);
  assert.ok(result.reason.includes('ODC_PARTNER_ID'));
});

test('isConfigured reports true once ODC_PARTNER_ID is set, but searchRvRentals still stays honest about unimplemented request logic', async () => {
  process.env.ODC_PARTNER_ID = 'test-partner-id';
  assert.equal(outdoorsyAdapter.isConfigured(), true);

  const result = await outdoorsyAdapter.searchRvRentals();
  assert.equal(result.configured, false);
  assert.ok(result.reason.includes('not been implemented'));
});
