const fs = require('fs');
const path = require('path');
const { DEFAULT_PROFILE } = require('../data/defaultProfile');

/**
 * File-backed persistence for the Personal Travel Profile. Deliberately simple for Phase 1 (no
 * database dependency introduced until a later phase actually needs multi-record persistence —
 * this is a single-user, single-record profile). Only the delta from defaults is written to disk.
 *
 * KNOWN LIMITATION: Railway's default filesystem is ephemeral across deploys/restarts — a profile
 * edit persists across requests on a running instance but is NOT guaranteed to survive a redeploy
 * unless a persistent volume is attached. See the Phase 1 completion report.
 */

const STORE_PATH = path.join(__dirname, '..', '..', 'data', 'profile.local.json');

function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepMerge(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override !== undefined ? override : base;
  }
  const result = { ...base };
  for (const key of Object.keys(override)) {
    result[key] = isPlainObject(base[key]) && isPlainObject(override[key])
      ? deepMerge(base[key], override[key])
      : override[key];
  }
  return result;
}

function readStoredOverrides() {
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredOverrides(overrides) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(overrides, null, 2));
}

function getProfile() {
  return deepMerge(DEFAULT_PROFILE, readStoredOverrides());
}

/**
 * Validates the numeric ordering constraints the rest of the app relies on (budget/travel-time/
 * trip-length models assume preferred <= stretch <= max). Throws a descriptive error rather than
 * silently accepting an inconsistent profile.
 */
function validateProfile(profile) {
  const { budget, travelTime, tripLength } = profile;

  if (budget) {
    const { preferred, stretch, absoluteMax } = budget;
    if (preferred && preferred.min > preferred.max) {
      throw new Error('budget.preferred.min must be <= budget.preferred.max');
    }
    if (preferred && stretch && stretch.enabled && stretch.max < preferred.max) {
      throw new Error('budget.stretch.max must be >= budget.preferred.max when stretch is enabled');
    }
    if (stretch && absoluteMax != null && stretch.enabled && stretch.max > absoluteMax) {
      throw new Error('budget.stretch.max must be <= budget.absoluteMax');
    }
  }

  if (travelTime) {
    const { preferred, stretch, absoluteMax } = travelTime;
    if (preferred != null && stretch && stretch.enabled && stretch.max < preferred) {
      throw new Error('travelTime.stretch.max must be >= travelTime.preferred when stretch is enabled');
    }
    if (stretch && absoluteMax != null && stretch.enabled && stretch.max > absoluteMax) {
      throw new Error('travelTime.stretch.max must be <= travelTime.absoluteMax');
    }
  }

  if (tripLength) {
    const { preferred, stretch, max } = tripLength;
    if (stretch && preferred != null && (preferred < stretch.min || preferred > stretch.max)) {
      throw new Error('tripLength.preferred should fall within tripLength.stretch.min/max');
    }
    if (max != null && stretch && stretch.max > max) {
      throw new Error('tripLength.stretch.max must be <= tripLength.max');
    }
  }

  return profile;
}

function updateProfile(partial) {
  const currentOverrides = readStoredOverrides();
  const mergedOverrides = deepMerge(currentOverrides, partial);
  const candidateProfile = deepMerge(DEFAULT_PROFILE, mergedOverrides);
  validateProfile(candidateProfile);
  writeStoredOverrides(mergedOverrides);
  return candidateProfile;
}

function resetProfile() {
  try {
    fs.unlinkSync(STORE_PATH);
  } catch {
    // nothing to remove — already at defaults
  }
  return getProfile();
}

module.exports = { getProfile, updateProfile, resetProfile, validateProfile, STORE_PATH };
