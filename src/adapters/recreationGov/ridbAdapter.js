/**
 * Recreation.gov's official Recreation Information Database (RIDB) API — the government's own
 * open data API for federal campgrounds/facilities. Requires a free API key from
 * https://ridb.recreation.gov/landing/getting-started (developer must self-register; not
 * something this codebase can obtain on its own). Stubbed until RIDB_API_KEY is provided.
 *
 * Per spec section 23, this ranks below the state/county/municipal reservation system when one
 * exists for a given property — most of the traveler's favorite campgrounds are state parks or
 * private resorts, not federal RIDB facilities, so this adapter is primarily for NPS-adjacent
 * federal campgrounds discovered during expansion search.
 */

const RIDB_BASE = 'https://ridb.recreation.gov/api/v1';

function isConfigured() {
  return Boolean(process.env.RIDB_API_KEY);
}

async function searchFacilities(query) {
  if (!isConfigured()) {
    return { configured: false, reason: 'RIDB_API_KEY not set — see adapter header comment for how to obtain one.', results: [] };
  }

  const url = `${RIDB_BASE}/facilities?query=${encodeURIComponent(query)}&activity=CAMPING`;
  const res = await fetch(url, { headers: { apikey: process.env.RIDB_API_KEY } });
  if (!res.ok) throw new Error(`RIDB request failed: ${res.status}`);
  const data = await res.json();
  return { configured: true, results: data.RECDATA || [] };
}

module.exports = { isConfigured, searchFacilities };
