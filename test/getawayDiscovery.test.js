const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildStayCandidates } = require('../src/domain/getawayDiscovery');
const { STAY_TYPE } = require('../src/data/getawayStaySources');

test('buildStayCandidates covers every stay type when none is requested', () => {
  const candidates = buildStayCandidates({ locationQuery: 'Minnesota' });
  const typesPresent = new Set(candidates.map((c) => c.stayType));
  for (const t of Object.values(STAY_TYPE)) {
    assert.ok(typesPresent.has(t), `missing stay type ${t}`);
  }
});

test('buildStayCandidates restricts to the requested stay types only', () => {
  const candidates = buildStayCandidates({ stayTypes: [STAY_TYPE.FARM_STAY] });
  assert.ok(candidates.length > 0);
  assert.ok(candidates.every((c) => c.stayType === STAY_TYPE.FARM_STAY));
});

test('buildStayCandidates gives every candidate a usable deep link', () => {
  const candidates = buildStayCandidates({ stayTypes: [STAY_TYPE.RV_RENTAL], locationQuery: 'Brainerd MN' });
  assert.ok(candidates.every((c) => typeof c.deepLink === 'string' && c.deepLink.startsWith('https://')));
});
