const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BOOKING_STATUS,
  validateBookingLink,
  determineButtonLabel,
  determineBookingStatus,
  formatPriceDisclaimer,
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
