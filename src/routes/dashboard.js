const express = require('express');
const campgroundService = require('../services/campgroundService');
const { getAutomaticRecommendations } = require('../services/recommendationService');

const router = express.Router();

const PREFERENCE_OPTIONS = ['camping', 'scenery', 'waterfront', 'hiking', 'swimming', 'fishing', 'warm weather', 'relaxation', 'road trip'];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function renderTripCard(rec) {
  const statusStyle = STATUS_STYLE[rec.bookingStatus] || STATUS_STYLE.RESEARCH_ONLY;
  return `
  <article class="card">
    <div class="card-head">
      <h3>${esc(rec.name)}</h3>
      <span class="badge" style="background:#1e3a5f;color:#bfdbfe">${rec.discoveryScore}/100</span>
    </div>
    <p class="loc">${esc(rec.region)} · season: ${esc(rec.season)}</p>
    <p class="flags" style="color:#9ca3af">${esc(rec.reason)}</p>
    <div class="meta">
      <span>seasonal fit: ${rec.seasonalFitScore}/100</span>
      <span>preference match: ${rec.preferenceMatchScore}/100</span>
      <span>trip score: ${rec.tripScore}/100</span>
    </div>
    <div class="booking">
      <span class="badge" style="background:${statusStyle.bg};color:${statusStyle.fg}">${esc(rec.bookingStatus)}</span>
    </div>
    <p class="disclaimer">${esc(rec.bookingStatusReason)}</p>
  </article>`;
}

const VERDICT_STYLE = {
  QUALIFIED: { label: 'QUALIFIED', bg: '#0f5132', fg: '#d1f2df' },
  CONDITIONAL_FAILED: { label: 'FAILED REQUIREMENT', bg: '#5c1a1a', fg: '#f8d7da' },
  INSUFFICIENT_EVIDENCE: { label: 'INSUFFICIENT EVIDENCE', bg: '#5c4b12', fg: '#fff3cd' },
};

const STATUS_STYLE = {
  BOOKING_READY: { bg: '#0f5132', fg: '#d1f2df' },
  CHECK_AVAILABILITY: { bg: '#0c4a6e', fg: '#cdeeff' },
  RESEARCH_ONLY: { bg: '#374151', fg: '#e5e7eb' },
  MONITOR: { bg: '#5c4b12', fg: '#fff3cd' },
};

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function hookupIcon(value) {
  if (value === 'YES') return '✓';
  if (value === 'NO') return '✗';
  return '?';
}

function fmtHours(h) {
  return typeof h === 'number' ? `~${h}h from 55449` : 'distance unknown';
}

function isUrl(str) {
  return /^https?:\/\//i.test(str);
}

function renderSource(s) {
  return isUrl(s) ? `<a href="${esc(s)}" target="_blank" rel="noopener">${esc(s)}</a>` : esc(s);
}

function renderCard(c, booking) {
  const v = VERDICT_STYLE[c.qualification.verdict];
  const status = booking ? STATUS_STYLE[booking.bookingStatus] || STATUS_STYLE.RESEARCH_ONLY : STATUS_STYLE.RESEARCH_ONLY;
  const flags = c.qualification.failedRequirements.concat(c.qualification.unresolvedRequirements);

  return `
  <article class="card">
    <div class="card-head">
      <h3>${esc(c.resolvedName)}</h3>
      <span class="badge" style="background:${v.bg};color:${v.fg}">${v.label}</span>
    </div>
    ${c.ambiguous ? `<p class="ambig">⚠ ${esc(c.ambiguityNote)}</p>` : ''}
    <p class="loc">${esc(c.location || 'location unknown')} · ${esc(fmtHours(c.drivingHoursFrom55449))}</p>
    <div class="facts">
      <span title="Waterfront">🌊 ${esc(c.waterfrontStatus)}</span>
      <span title="Water hookup">💧 ${hookupIcon(c.waterHookup)}</span>
      <span title="Electric hookup">⚡ ${hookupIcon(c.electricHookup)}${c.electricAmperage && c.electricAmperage !== 'UNKNOWN' ? ` ${esc(c.electricAmperage)}` : ''}</span>
      <span title="Sewer hookup">🚽 ${hookupIcon(c.sewerHookup)}</span>
      <span title="Hot showers">🚿 ${hookupIcon(c.bathhouse?.hotShowers)}</span>
    </div>
    ${flags.length ? `<p class="flags">Blocking: ${flags.map(esc).join(', ')}</p>` : ''}
    <div class="meta">
      <span>${c.nightlyRate?.amount != null ? `$${c.nightlyRate.amount}/${esc(c.nightlyRate.unit || 'night')}` : 'rate unknown'}</span>
      <span>evidence: ${esc(c.verification?.confidence || 'UNKNOWN')}</span>
      <span>verified ${esc((c.verification?.verifiedAt || '').slice(0, 10))}</span>
    </div>
    ${booking ? `
    <div class="booking">
      <span class="badge" style="background:${status.bg};color:${status.fg}">${esc(booking.bookingStatus)}</span>
      ${booking.bookingUrl
      ? `<a class="btn" href="${esc(booking.bookingUrl)}" target="_blank" rel="noopener">${esc(booking.buttonLabel || 'View')}</a>`
      : `<span class="btn-disabled">${c.noReservationReason ? esc(c.noReservationReason) : 'No validated booking link'}</span>`}
    </div>
    ${booking.priceDisclaimer ? `<p class="disclaimer">${esc(booking.priceDisclaimer)}</p>` : ''}
    ` : ''}
    <details>
      <summary>Sources (${c.verification?.sources?.length || 0})</summary>
      <ul>${(c.verification?.sources || []).map((s) => `<li>${renderSource(s)}</li>`).join('')}</ul>
      ${c.verification?.notes ? `<p class="notes">${esc(c.verification.notes)}</p>` : ''}
    </details>
  </article>`;
}

router.get('/', async (req, res, next) => {
  try {
    const favorites = campgroundService.listFavorites();
    const discoveries = campgroundService.listSimilarDiscoveries();
    const qualified = campgroundService.getQualifiedFavorites();
    const ranked = campgroundService.rankFavoritesByValue(qualified);

    const allForBooking = [...favorites, ...discoveries];
    const bookingResults = await Promise.all(allForBooking.map((c) => campgroundService.buildBookingInfo(c)));
    const bookingById = Object.fromEntries(allForBooking.map((c, i) => [c.id, bookingResults[i]]));

    const rankedIds = new Set(ranked.map((c) => c.id));
    const rest = favorites.filter((c) => !rankedIds.has(c.id));

    const startDate = typeof req.query.startDate === 'string' && req.query.startDate ? req.query.startDate : todayIso();
    const selectedPrefs = typeof req.query.preferences === 'string' && req.query.preferences
      ? req.query.preferences.split(',').map((p) => p.trim()).filter(Boolean)
      : [];
    const trips = await getAutomaticRecommendations({ startDate, preferences: selectedPrefs });

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Travel Intelligence Agent</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px; background: #0b0f14; color: #e5e7eb; font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #9ca3af; margin: 0 0 28px; font-size: 13px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .04em; color: #9ca3af; margin: 32px 0 12px; border-bottom: 1px solid #1f2937; padding-bottom: 8px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
  .card { background: #131a22; border: 1px solid #1f2937; border-radius: 10px; padding: 16px; }
  .card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
  .card-head h3 { margin: 0; font-size: 15px; }
  .badge { font-size: 10px; font-weight: 700; letter-spacing: .03em; padding: 3px 8px; border-radius: 999px; white-space: nowrap; }
  .ambig { color: #fbbf24; font-size: 12px; margin: 8px 0 0; }
  .loc { color: #9ca3af; font-size: 12px; margin: 8px 0; }
  .facts { display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; margin: 10px 0; color: #d1d5db; }
  .flags { font-size: 12px; color: #f87171; margin: 6px 0; }
  .meta { display: flex; gap: 12px; font-size: 11px; color: #9ca3af; margin: 10px 0; flex-wrap: wrap; }
  .booking { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
  .btn { background: #2563eb; color: #fff; text-decoration: none; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 6px; }
  .btn-disabled { color: #6b7280; font-size: 11px; font-style: italic; }
  .disclaimer { font-size: 10px; color: #6b7280; margin: 6px 0 0; }
  details { margin-top: 10px; font-size: 12px; }
  summary { cursor: pointer; color: #93c5fd; }
  details ul { margin: 6px 0; padding-left: 18px; }
  details a { color: #93c5fd; word-break: break-all; }
  .notes { color: #9ca3af; font-size: 11px; }
  .empty { color: #6b7280; font-size: 13px; }
  .trip-form { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; background: #131a22; border: 1px solid #1f2937; border-radius: 10px; padding: 16px; margin-bottom: 8px; }
  .trip-form label { font-size: 12px; color: #d1d5db; display: flex; align-items: center; gap: 6px; }
  .trip-form input[type="date"] { background: #0b0f14; border: 1px solid #374151; color: #e5e7eb; border-radius: 6px; padding: 4px 8px; }
  .trip-form fieldset { border: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 10px; }
  .trip-form legend { font-size: 11px; color: #6b7280; padding: 0; }
  .chip { background: #0b0f14; border: 1px solid #374151; border-radius: 999px; padding: 4px 10px; font-size: 12px; }
  .trip-form button.btn { border: none; cursor: pointer; font: inherit; }
</style>
</head>
<body>
  <h1>🧭 Travel Intelligence Agent</h1>
  <p class="sub">Traveler home: ZIP 55449, Minnesota</p>

  <h2>Vacation destination discovery (spec §1-3)</h2>
  <form class="trip-form" method="get">
    <label>Trip start date <input type="date" name="startDate" value="${esc(startDate)}" /></label>
    <fieldset>
      <legend>Preferences</legend>
      ${PREFERENCE_OPTIONS.map((p) => `<label class="chip"><input type="checkbox" name="preferences" value="${esc(p)}" ${selectedPrefs.includes(p) ? 'checked' : ''} /> ${esc(p)}</label>`).join('')}
    </fieldset>
    <button type="submit" class="btn">Discover destinations</button>
  </form>
  <p class="sub">No destination required — pick a date and preferences and the engine discovers candidates (currently: a curated summer-outdoor / warm-escape catalog scored by season + preference match). Flights and hotels have no live adapter configured yet, so every result is RESEARCH_ONLY, not bookable.</p>
  <div class="grid">
    ${trips.length ? trips.map(renderTripCard).join('') : '<p class="empty">No destination cleared the minimum score for this date/preference combination.</p>'}
  </div>

  <h1 style="margin-top:40px">🏕 Favorite Campground List</h1>
  <p class="sub">${favorites.length} researched favorites · ${discoveries.length} similar discoveries · ${qualified.length} pass strict qualification</p>

  <h2>Ranked (qualified)</h2>
  <div class="grid">
    ${ranked.length ? ranked.map((c) => renderCard(c, bookingById[c.id])).join('') : '<p class="empty">Nothing currently passes every mandatory requirement.</p>'}
  </div>

  <h2>Rest of favorite list</h2>
  <div class="grid">
    ${rest.map((c) => renderCard(c, bookingById[c.id])).join('')}
  </div>

  <h2>Similar discoveries (spec §11)</h2>
  <div class="grid">
    ${discoveries.map((c) => renderCard(c, bookingById[c.id])).join('')}
  </div>
</body>
</html>`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
