const { test } = require('node:test');
const assert = require('node:assert/strict');
const { determineBookingOrder } = require('../src/domain/bookingOrder');

test('default order matches the spec sequence', () => {
  const order = determineBookingOrder([
    { type: 'ATTRACTION_TICKETS' },
    { type: 'FLIGHT' },
    { type: 'HOTEL_OR_CAMPGROUND' },
  ]);
  assert.deepEqual(order.map((o) => o.type), ['FLIGHT', 'HOTEL_OR_CAMPGROUND', 'ATTRACTION_TICKETS']);
});

test('limited inventory item moves ahead of its default slot', () => {
  const order = determineBookingOrder([
    { type: 'FLIGHT' },
    { type: 'HOTEL_OR_CAMPGROUND', limitedInventory: true, limitedInventoryReason: 'Waterfront sites are limited.' },
  ]);
  assert.equal(order[0].type, 'HOTEL_OR_CAMPGROUND');
  assert.equal(order[0].note, 'Waterfront sites are limited.');
});
