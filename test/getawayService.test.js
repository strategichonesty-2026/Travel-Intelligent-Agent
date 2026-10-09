const { test, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const ridbAdapter = require('../src/adapters/recreationGov/ridbAdapter');
const { searchGetaways } = require('../src/services/getawayService');
const { STAY_TYPE } = require('../src/data/getawayStaySources');
const { BOOKING_STATUS, LINK_TYPE, COMBO_STATUS } = require('../src/domain/bookingStatus');

afterEach(() => {
  mock.restoreAll();
});

test('searchGetaways returns deep-link-only candidates with no RIDB configured', async () => {
  mock.method(ridbAdapter, 'isConfigured', () => false);

  const { candidates } = await searchGetaways({ startDate: '2026-11-01', stayTypes: [STAY_TYPE.FARM_STAY] });

  assert.ok(candidates.length > 0);
  assert.ok(candidates.every((c) => c.linkType === LINK_TYPE.INFORMATIONAL_SOURCE));
  assert.ok(candidates.every((c) => c.bookingStatus === BOOKING_STATUS.RESEARCH_ONLY));
});

test('searchGetaways folds in live RIDB facilities as CHECK_AVAILABILITY, never BOOKING_READY', async () => {
  mock.method(ridbAdapter, 'isConfigured', () => true);
  mock.method(ridbAdapter, 'searchFacilities', async () => ({
    configured: true,
    results: [{ FacilityID: '12345', FacilityName: 'Test Federal Campground', FacilityLatitude: 46.0, FacilityLongitude: -91.0 }],
  }));

  const { candidates } = await searchGetaways({ startDate: '2026-11-01', locationQuery: 'Wisconsin', stayTypes: [STAY_TYPE.CAMPSITE] });

  const ridbCandidate = candidates.find((c) => c.sourceId === 'recreation-gov');
  assert.ok(ridbCandidate);
  assert.equal(ridbCandidate.bookingStatus, BOOKING_STATUS.CHECK_AVAILABILITY);
  assert.equal(ridbCandidate.linkType, LINK_TYPE.OFFICIAL_BOOKING);
  assert.equal(ridbCandidate.deepLink, 'https://www.recreation.gov/camping/campgrounds/12345');
});

test('searchGetaways computes a MANUAL_COORDINATION combo status when RV and campsite are both requested with no live links', async () => {
  mock.method(ridbAdapter, 'isConfigured', () => false);

  const { comboStatus } = await searchGetaways({ startDate: '2026-11-01', stayTypes: [STAY_TYPE.RV_RENTAL, STAY_TYPE.CAMPSITE] });

  assert.equal(comboStatus, COMBO_STATUS.MANUAL_COORDINATION);
});

test('searchGetaways omits comboStatus when only one of RV/campsite is requested', async () => {
  mock.method(ridbAdapter, 'isConfigured', () => false);

  const { comboStatus } = await searchGetaways({ startDate: '2026-11-01', stayTypes: [STAY_TYPE.VACATION_RENTAL] });

  assert.equal(comboStatus, null);
});
