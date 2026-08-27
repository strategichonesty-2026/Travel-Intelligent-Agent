const fs = require('fs');
const path = require('path');

/**
 * A hard, code-level ceiling on live provider API calls per week, independent of and in addition
 * to whatever quota/budget is configured on the provider's own dashboard (Google Cloud Console,
 * Duffel). This exists specifically so a bug, retry loop, or unexpected traffic can never run up
 * real cost beyond a number set in code — once the weekly budget for a provider is exhausted,
 * dealBoard.js stops calling it entirely for the rest of the window, falling back to cached data
 * (even if stale) or an honest "budget exhausted" message, never a live call anyway.
 *
 * File-backed for the same reason as profileService.js/liveDataCache.js (simple, no DB needed for
 * a single-user app); same ephemeral-filesystem caveat on Railway.
 */

const BUDGET_PATH = path.join(__dirname, '..', '..', 'data', 'apiCallBudget.local.json');
const DEFAULT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // one week, matching the traveler's own usage cadence

function readState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(BUDGET_PATH, 'utf8'));
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeState(state) {
  fs.mkdirSync(path.dirname(BUDGET_PATH), { recursive: true });
  fs.writeFileSync(BUDGET_PATH, JSON.stringify(state, null, 2));
}

/**
 * Call BEFORE making a live provider request. Returns { allowed, remaining }. When allowed is
 * true, the call is already recorded (consumed) — go ahead and make the request. When false, the
 * caller must NOT call the provider; the budget for this window is spent.
 */
function tryConsumeBudget(provider, maxCallsPerWindow, windowMs = DEFAULT_WINDOW_MS) {
  const state = readState();
  const now = Date.now();
  const entry = state[provider];

  if (!entry || now - entry.windowStart > windowMs) {
    // A fresh window still must respect maxCallsPerWindow <= 0 — without this check, the very
    // first call of any new window was always let through regardless of the configured max.
    if (maxCallsPerWindow <= 0) {
      state[provider] = { windowStart: now, count: 0 };
      writeState(state);
      return { allowed: false, remaining: 0 };
    }
    state[provider] = { windowStart: now, count: 1 };
    writeState(state);
    return { allowed: true, remaining: maxCallsPerWindow - 1 };
  }

  if (entry.count >= maxCallsPerWindow) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  writeState(state);
  return { allowed: true, remaining: maxCallsPerWindow - entry.count };
}

function getBudgetStatus(provider, maxCallsPerWindow, windowMs = DEFAULT_WINDOW_MS) {
  const entry = readState()[provider];
  if (!entry || Date.now() - entry.windowStart > windowMs) {
    return { used: 0, max: maxCallsPerWindow, windowResetAt: null };
  }
  return { used: entry.count, max: maxCallsPerWindow, windowResetAt: new Date(entry.windowStart + windowMs).toISOString() };
}

function resetBudgetForTests() {
  try {
    fs.unlinkSync(BUDGET_PATH);
  } catch {
    // nothing to reset
  }
}

module.exports = { tryConsumeBudget, getBudgetStatus, resetBudgetForTests, DEFAULT_WINDOW_MS, BUDGET_PATH };
