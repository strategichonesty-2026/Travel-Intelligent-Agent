const DEFAULT_BOOKING_ORDER = Object.freeze([
  'FLIGHT',
  'HOTEL_OR_CAMPGROUND',
  'RENTAL_CAR_OR_TRANSPORTATION',
  'NATIONAL_PARK_RESERVATION',
  'TIMED_ENTRY_PERMIT',
  'ATTRACTION_TICKETS',
  'EXCURSIONS',
]);

/**
 * components: [{ type: one of DEFAULT_BOOKING_ORDER, limitedInventory?: boolean, limitedInventoryReason?: string }]
 * Section 9: items with limited inventory move earlier, ahead of their default slot, but never
 * ahead of each other out of relative order (stable sort).
 */
function determineBookingOrder(components) {
  const present = components.filter((c) => DEFAULT_BOOKING_ORDER.includes(c.type));
  const withIndex = present.map((c, i) => ({ ...c, originalIndex: i, defaultRank: DEFAULT_BOOKING_ORDER.indexOf(c.type) }));

  withIndex.sort((a, b) => {
    if (a.limitedInventory !== b.limitedInventory) return a.limitedInventory ? -1 : 1;
    return a.defaultRank - b.defaultRank;
  });

  return withIndex.map((c, i) => ({
    step: i + 1,
    type: c.type,
    limitedInventory: Boolean(c.limitedInventory),
    note: c.limitedInventory ? (c.limitedInventoryReason || 'Limited inventory — reserve early.') : null,
  }));
}

module.exports = { DEFAULT_BOOKING_ORDER, determineBookingOrder };
