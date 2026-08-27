const fs = require('fs');
const path = require('path');

/**
 * File-backed cache for live provider responses (flights/hotels), keyed by search parameters.
 * Purpose: if the traveler loads the Discover page several times in the same week, this reuses
 * the first real response instead of re-hitting Duffel/Google Places each time — directly
 * reduces live API call volume to match an infrequent ("once a week") usage pattern.
 *
 * KNOWN LIMITATION: same as profileService.js — Railway's default filesystem is ephemeral across
 * deploys/restarts, so the cache resets on redeploy. Fine for this app's low deploy frequency and
 * weekly-ish usage; would need a real persistent store (volume or DB) to survive redeploys.
 */

const CACHE_PATH = path.join(__dirname, '..', '..', 'data', 'liveApiCache.local.json');

function readCache() {
  try {
    const parsed = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

/**
 * Returns { data, cachedAt, stale } if anything is cached under `key` (stale=true once past
 * ttlMs, but still returned — a stale-but-real result is a legitimate last-resort fallback when
 * the call budget is exhausted; see callBudget.js), or null if nothing has ever been cached.
 */
function getCacheEntry(key, ttlMs) {
  const entry = readCache()[key];
  if (!entry) return null;
  const ageMs = Date.now() - new Date(entry.cachedAt).getTime();
  return { data: entry.data, cachedAt: entry.cachedAt, stale: ageMs > ttlMs };
}

function setCacheEntry(key, data) {
  const cache = readCache();
  cache[key] = { data, cachedAt: new Date().toISOString() };
  writeCache(cache);
}

function clearCacheForTests() {
  try {
    fs.unlinkSync(CACHE_PATH);
  } catch {
    // nothing to clear
  }
}

module.exports = { getCacheEntry, setCacheEntry, clearCacheForTests, CACHE_PATH };
