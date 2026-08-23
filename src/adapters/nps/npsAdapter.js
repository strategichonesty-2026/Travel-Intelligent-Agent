/**
 * Official National Park Service API (developer.nps.gov). Free API key, self-service signup
 * required (not something this codebase can obtain on its own). Stubbed until NPS_API_KEY is
 * provided. Used for national-park candidates surfaced during summer discovery (spec section 1)
 * and for seasonal-closure checks (spec section 27).
 */

const NPS_BASE = 'https://developer.nps.gov/api/v1';

function isConfigured() {
  return Boolean(process.env.NPS_API_KEY);
}

async function getParkAlerts(parkCode) {
  if (!isConfigured()) {
    return { configured: false, reason: 'NPS_API_KEY not set — see adapter header comment for how to obtain one.', alerts: [] };
  }

  const url = `${NPS_BASE}/alerts?parkCode=${encodeURIComponent(parkCode)}&api_key=${process.env.NPS_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NPS request failed: ${res.status}`);
  const data = await res.json();
  return { configured: true, alerts: data.data || [] };
}

module.exports = { isConfigured, getParkAlerts };
