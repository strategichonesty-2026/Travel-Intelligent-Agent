const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const vrboLinkOffAdapter = require('../src/adapters/vrboLinkOff/vrboLinkOffAdapter');

let originalId;

beforeEach(() => {
  originalId = process.env.VRBO_PARTNERIZE_ID;
});

afterEach(() => {
  if (originalId === undefined) delete process.env.VRBO_PARTNERIZE_ID;
  else process.env.VRBO_PARTNERIZE_ID = originalId;
});

test('isConfigured is false and buildLinkOffUrl returns null when VRBO_PARTNERIZE_ID is unset', () => {
  delete process.env.VRBO_PARTNERIZE_ID;
  assert.equal(vrboLinkOffAdapter.isConfigured(), false);
  assert.equal(vrboLinkOffAdapter.buildLinkOffUrl(), null);
});

test('isConfigured reports true once VRBO_PARTNERIZE_ID is set, but buildLinkOffUrl stays honest about the unimplemented URL template', () => {
  process.env.VRBO_PARTNERIZE_ID = 'test-partnerize-id';
  assert.equal(vrboLinkOffAdapter.isConfigured(), true);
  // Real redirect template is issued during Partnerize onboarding — not guessed, see adapter header.
  assert.equal(vrboLinkOffAdapter.buildLinkOffUrl(), null);
});
