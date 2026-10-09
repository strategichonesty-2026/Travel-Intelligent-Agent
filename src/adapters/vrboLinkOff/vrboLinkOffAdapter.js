/**
 * Vrbo "link-off" (via Expedia Partner Solutions / Partnerize) — the lowest-barrier of Vrbo's two
 * gated access tiers (the other, Vrbo-on-Rapid content+rates, is further gated still). Link-off
 * needs no API development, just an approved affiliate identifier appended to a redirect URL —
 * but approval still requires contracting with EPS, Vrbo, and Partnerize, which is a business
 * process this codebase cannot complete on its own. Stubbed until VRBO_PARTNERIZE_ID is set.
 *
 * Until then, Vrbo stays in GETAWAY_STAY_SOURCES as a plain deep-link (site-scoped Google
 * search) like every other unconfigured source — this adapter exists so that, once approved, the
 * link-off URL can be swapped in without touching the discovery/service layer.
 */

function isConfigured() {
  return Boolean(process.env.VRBO_PARTNERIZE_ID);
}

/**
 * Once configured: a real Vrbo link-off URL carries the Partnerize affiliate ID and redirects
 * the traveler to Vrbo's own search/booking flow — still not a live availability API, but a
 * sanctioned (not guessed) link, so it can be labeled LINK_TYPE.AUTHORIZED_BOOKING_PROVIDER
 * instead of INFORMATIONAL_SOURCE.
 */
function buildLinkOffUrl() {
  if (!isConfigured()) return null;
  // Not implemented: the exact redirect URL format is issued during Partnerize onboarding, not
  // publicly documented — fill in once approval provides the real template, same reasoning as
  // outdoorsyAdapter.js's stub.
  return null;
}

module.exports = { isConfigured, buildLinkOffUrl };
