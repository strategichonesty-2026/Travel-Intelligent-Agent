/**
 * Outdoorsy's Trailblazer Partner API (developers.outdoorsy.com) — the one RV-rental provider
 * with a real documented REST API (a read-only Search API at search.outdoorsy.com, plus a core
 * booking API, both with public Swagger specs). Production access is gated behind partner
 * approval: apply at developers.outdoorsy.com, no cost to apply, approval not guaranteed, not
 * something this codebase can do on its own (it's a business application, not an account
 * signup). Stubbed until ODC_PARTNER_ID is provided, matching the param name Outdoorsy's own
 * deep-link docs use (`odc_partner` — required for attribution on every request).
 *
 * Deliberately NOT implementing the actual request/response shape yet: the Swagger specs are
 * only reachable with partner-tier docs access, and writing speculative request logic against an
 * unverified shape would silently break once real credentials exist — worse than leaving it as
 * an honest stub. Implement searchRvRentals() for real once partner approval grants doc access,
 * the same way ridbAdapter.js/npsAdapter.js were written against their actually-public specs.
 */

function isConfigured() {
  return Boolean(process.env.ODC_PARTNER_ID);
}

async function searchRvRentals() {
  return {
    configured: false,
    reason: isConfigured()
      ? 'ODC_PARTNER_ID is set, but searchRvRentals() request logic has not been implemented yet — see adapter header comment.'
      : 'ODC_PARTNER_ID not set. Apply for Outdoorsy partner access at developers.outdoorsy.com (free to apply, approval not guaranteed) — this codebase cannot submit that application on its own.',
    results: [],
  };
}

module.exports = { isConfigured, searchRvRentals };
