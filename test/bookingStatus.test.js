const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BOOKING_STATUS,
  COMBO_STATUS,
  validateBookingLink,
  determineButtonLabel,
  determineBookingStatus,
  formatPriceDisclaimer,
  combineRvAndSiteStatus,
} = require('../src/domain/bookingStatus');

const passingLink = {
  urlExists: true,
  belongsToAuthorizedProvider: true,
  matchesProperty: true,
  notObviouslyExpired: true,
  isAccessible: true,
  reservationMechanismIdentifiable: true,
};

test('validateBookingLink passes only when every check passes', () => {
  assert.equal(validateBookingLink(passingLink).valid, true);
  assert.equal(validateBookingLink({ ...passingLink, isAccessible: false }).valid, false);
});

test('BOOKING_READY requires every mandatory field', () => {
  const status = determineBookingStatus({
    mandatoryConstraintsPassed: true,
    currentPriceVerified: true,
    currentAvailabilityVerified: true,
    bookingSourceIdentified: true,
    mandatoryFeesIdentified: true,
    criticalAmenitiesVerified: true,
    cancellationPolicyIdentified: true,
    bookingLinkValidation: validateBookingLink(passingLink),
  });
  assert.equal(status, BOOKING_STATUS.BOOKING_READY);
});

test('missing price verification falls back to CHECK_AVAILABILITY, not BOOKING_READY', () => {
  const status = determineBookingStatus({
    mandatoryConstraintsPassed: true,
    currentPriceVerified: false,
    currentAvailabilityVerified: true,
    bookingSourceIdentified: true,
    mandatoryFeesIdentified: true,
    criticalAmenitiesVerified: true,
    cancellationPolicyIdentified: true,
    bookingLinkValidation: validateBookingLink(passingLink),
  });
  assert.equal(status, BOOKING_STATUS.CHECK_AVAILABILITY);
});

test('no valid link falls back to RESEARCH_ONLY', () => {
  const status = determineBookingStatus({
    mandatoryConstraintsPassed: true,
    currentPriceVerified: true,
    bookingSourceIdentified: false,
    bookingLinkValidation: null,
  });
  assert.equal(status, BOOKING_STATUS.RESEARCH_ONLY);
});

test('determineButtonLabel picks Book Now only when availability is verified', () => {
  assert.equal(determineButtonLabel({ availabilityVerified: true }), 'Book Now');
  assert.equal(determineButtonLabel({ availabilityVerified: false }), 'Check Availability');
});

test('formatPriceDisclaimer always includes the checkout-price caveat', () => {
  const msg = formatPriceDisclaimer('2026-08-23T00:00:00.000Z');
  assert.match(msg, /Price verified at/);
  assert.match(msg, /confirmed by the booking provider at checkout/);
});

test('combineRvAndSiteStatus is CONFIRMED only when both legs are independently ready', () => {
  assert.equal(combineRvAndSiteStatus(BOOKING_STATUS.BOOKING_READY, BOOKING_STATUS.BOOKING_READY), COMBO_STATUS.CONFIRMED);
  assert.equal(combineRvAndSiteStatus(BOOKING_STATUS.BOOKED, BOOKING_STATUS.BOOKING_READY), COMBO_STATUS.CONFIRMED);
});

test('combineRvAndSiteStatus is PARTIALLY_CONFIRMED when only one leg has an actionable link', () => {
  assert.equal(combineRvAndSiteStatus(BOOKING_STATUS.CHECK_AVAILABILITY, BOOKING_STATUS.RESEARCH_ONLY), COMBO_STATUS.PARTIALLY_CONFIRMED);
  assert.equal(combineRvAndSiteStatus(BOOKING_STATUS.RESEARCH_ONLY, BOOKING_STATUS.BOOKING_READY), COMBO_STATUS.PARTIALLY_CONFIRMED);
});

test('combineRvAndSiteStatus is MANUAL_COORDINATION when neither leg has a live link (today\'s default)', () => {
  assert.equal(combineRvAndSiteStatus(BOOKING_STATUS.RESEARCH_ONLY, BOOKING_STATUS.RESEARCH_ONLY), COMBO_STATUS.MANUAL_COORDINATION);
});
