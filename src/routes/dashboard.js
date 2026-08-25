const express = require('express');
const campgroundService = require('../services/campgroundService');
const { getAutomaticRecommendations } = require('../services/recommendationService');
const { getDestinationsByCategory } = require('../domain/destinationDiscovery');

const router = express.Router();

// "Trail Report" palette — warm data-analyst aesthetic (grotesk + mono, olive/clay accents).
const BG = '#f7f3ea';
const CARD = '#fffdf8';
const INK = '#241f1a';
const MUTED = '#8a7f6e';
const BORDER = '#e3dac8';
const CLAY = '#b5583a';
const OLIVE = '#6b7a4f';
const RED = '#a13f3f';
const TEAL = '#3f6e7a';
const VIOLET = '#6a5b96';

const PREFERENCE_OPTIONS = ['camping', 'scenery', 'waterfront', 'hiking', 'swimming', 'fishing', 'warm weather', 'relaxation', 'road trip'];

const TABS = [
  { id: 'discover', label: 'Discover' },
  { id: 'camping', label: 'Camping' },
  { id: 'colorado', label: 'Colorado' },
  { id: 'niagara', label: 'Niagara Falls & Great Lakes' },
  { id: 'mexico', label: 'Mexico' },
  { id: 'socal', label: 'Southern California' },
  { id: 'florida', label: 'Florida' },
  { id: 'southwest', label: 'Arizona & Nevada' },
  { id: 'cruise', label: 'Cruise' },
];

const VERDICT_STYLE = {
  QUALIFIED: { label: 'QUALIFIED', bg: OLIVE, fg: '#f4f1e8' },
  CONDITIONAL_FAILED: { label: 'FAILED REQUIREMENT', bg: RED, fg: '#f9eeee' },
  INSUFFICIENT_EVIDENCE: { label: 'INSUFFICIENT EVIDENCE', bg: BORDER, fg: MUTED },
};

const STATUS_STYLE = {
  BOOKING_READY: { bg: OLIVE, fg: '#f4f1e8' },
  CHECK_AVAILABILITY: { bg: TEAL, fg: '#eef4f5' },
  RESEARCH_ONLY: { bg: BORDER, fg: MUTED },
  MONITOR: { bg: VIOLET, fg: '#f1eef9' },
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function isUrl(str) {
  return /^https?:\/\//i.test(str);
}

function renderSource(s) {
  return isUrl(s) ? `<a href="${esc(s)}" target="_blank" rel="noopener">${esc(s)}</a>` : esc(s);
}

function fmtHours(h) {
  return typeof h === 'number' ? `~${h}h from 55449` : 'distance unknown';
}

function hookupSymbol(value) {
  if (value === 'YES') return '✓';
  if (value === 'NO') return '✗';
  return '?';
}

// A single labeled fact chip — YES/NO/UNKNOWN drives the color, no emoji.
function factChip(label, status, detail) {
  const cls = status === 'YES' ? 'fact-yes' : status === 'NO' ? 'fact-no' : 'fact-unk';
  return `<span class="fact ${cls}">${esc(label)} ${hookupSymbol(status)}${detail ? ` &middot; ${esc(detail)}` : ''}</span>`;
}

function waterfrontStatusToChip(status) {
  const qualifying = status === 'DIRECT_WATERFRONT' || status === 'LAKE_VIEW';
  const known = status && status !== 'UNKNOWN';
  return factChip('WATERFRONT', qualifying ? 'YES' : known ? 'NO' : 'UNKNOWN', status);
}

function renderTripCard(rec) {
  const statusStyle = STATUS_STYLE[rec.bookingStatus] || STATUS_STYLE.RESEARCH_ONLY;
  return `
  <article class="card">
    <div class="card-head">
      <h3>${esc(rec.name)}</h3>
      <span class="score">${rec.discoveryScore}</span>
    </div>
    <p class="loc">${esc(rec.region)} &middot; season: ${esc(rec.season)}</p>
    <p class="reason">${esc(rec.reason)}</p>
    <div class="meta">
      <span>SEASONAL FIT ${rec.seasonalFitScore}</span>
      <span>PREFERENCE MATCH ${rec.preferenceMatchScore}</span>
      <span>TRIP SCORE ${rec.tripScore}</span>
    </div>
    <div class="booking">
      <span class="badge" style="background:${statusStyle.bg};color:${statusStyle.fg}">${esc(rec.bookingStatus)}</span>
    </div>
    <p class="disclaimer">${esc(rec.bookingStatusReason)}</p>
  </article>`;
}

function renderCategoryCard(d) {
  return `
  <article class="card">
    <div class="card-head">
      <h3>${esc(d.name)}</h3>
      <span class="score">${d.seasonalFitScore}</span>
    </div>
    <p class="loc">${esc(d.region)}</p>
    <p class="reason">${esc(d.seasonalFitReason)}</p>
    <div class="facts">${d.tags.map((t) => `<span class="fact fact-unk">${esc(t)}</span>`).join('')}</div>
    ${d.hurricaneRiskNote ? `<p class="ambig">${esc(d.hurricaneRiskNote)}</p>` : ''}
    <p class="disclaimer">Curated candidate, not independently researched like the campground list &mdash; no live flights/hotels adapter configured, so this is discovery-only, not bookable.</p>
  </article>`;
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
    ${c.ambiguous ? `<p class="ambig">${esc(c.ambiguityNote)}</p>` : ''}
    <p class="loc">${esc(c.location || 'location unknown')} &middot; ${esc(fmtHours(c.drivingHoursFrom55449))}</p>
    <div class="facts">
      ${waterfrontStatusToChip(c.waterfrontStatus)}
      ${factChip('WATER', c.waterHookup)}
      ${factChip('ELECTRIC', c.electricHookup, c.electricAmperage && c.electricAmperage !== 'UNKNOWN' ? c.electricAmperage : null)}
      ${factChip('SEWER', c.sewerHookup)}
      ${factChip('SHOWERS', c.bathhouse?.hotShowers)}
    </div>
    ${flags.length ? `<p class="flags">Blocking: ${flags.map(esc).join(', ')}</p>` : ''}
    <div class="meta">
      <span>${c.nightlyRate?.amount != null ? `$${c.nightlyRate.amount}/${esc(c.nightlyRate.unit || 'night')}` : 'RATE UNKNOWN'}</span>
      <span>EVIDENCE ${esc(c.verification?.confidence || 'UNKNOWN')}</span>
      <span>VERIFIED ${esc((c.verification?.verifiedAt || '').slice(0, 10))}</span>
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
    const activeTab = TABS.some((t) => t.id === req.query.tab) ? req.query.tab : 'discover';
    const startDate = typeof req.query.startDate === 'string' && req.query.startDate ? req.query.startDate : todayIso();
    const selectedPrefs = Array.isArray(req.query.preferences)
      ? req.query.preferences
      : typeof req.query.preferences === 'string' && req.query.preferences
        ? req.query.preferences.split(',').map((p) => p.trim()).filter(Boolean)
        : [];

    function tabHref(tabId) {
      const params = new URLSearchParams();
      params.set('tab', tabId);
      params.set('startDate', startDate);
      for (const p of selectedPrefs) params.append('preferences', p);
      return `?${params.toString()}`;
    }

    let campgroundSection = '';
    let discoverSection = '';
    let categorySection = '';

    if (activeTab === 'camping') {
      const favorites = campgroundService.listFavorites();
      const discoveries = campgroundService.listSimilarDiscoveries();
      const qualified = campgroundService.getQualifiedFavorites();
      const ranked = campgroundService.rankFavoritesByValue(qualified);

      const allForBooking = [...favorites, ...discoveries];
      const bookingResults = await Promise.all(allForBooking.map((c) => campgroundService.buildBookingInfo(c)));
      const bookingById = Object.fromEntries(allForBooking.map((c, i) => [c.id, bookingResults[i]]));

      const rankedIds = new Set(ranked.map((c) => c.id));
      const rest = favorites.filter((c) => !rankedIds.has(c.id));

      campgroundSection = `
  <p class="sub">${favorites.length} researched favorites &middot; ${discoveries.length} similar discoveries &middot; ${qualified.length} pass strict qualification</p>

  <h2>Ranked (qualified)</h2>
  <div class="grid">
    ${ranked.length ? ranked.map((c) => renderCard(c, bookingById[c.id])).join('') : '<p class="empty">Nothing currently passes every mandatory requirement.</p>'}
  </div>

  <h2>Rest of favorite list</h2>
  <div class="grid">
    ${rest.map((c) => renderCard(c, bookingById[c.id])).join('')}
  </div>

  <h2>Similar discoveries (spec &sect;11)</h2>
  <div class="grid">
    ${discoveries.map((c) => renderCard(c, bookingById[c.id])).join('')}
  </div>`;
    } else if (activeTab === 'discover') {
      const trips = await getAutomaticRecommendations({ startDate, preferences: selectedPrefs });
      discoverSection = `
  <form class="trip-form" method="get">
    <input type="hidden" name="tab" value="discover" />
    <label>Trip start date <input type="date" name="startDate" value="${esc(startDate)}" /></label>
    <fieldset>
      <legend>Preferences</legend>
      ${PREFERENCE_OPTIONS.map((p) => `<label class="chip"><input type="checkbox" name="preferences" value="${esc(p)}" ${selectedPrefs.includes(p) ? 'checked' : ''} /> ${esc(p)}</label>`).join('')}
    </fieldset>
    <button type="submit" class="submit-btn">Discover destinations</button>
  </form>
  <p class="sub">No destination required &mdash; pick a date and preferences and the engine discovers candidates across the full catalog, scored by season + preference match. Flights and hotels have no live adapter configured yet, so every result is RESEARCH_ONLY, not bookable.</p>
  <div class="grid">
    ${trips.length ? trips.map(renderTripCard).join('') : '<p class="empty">No destination cleared the minimum score for this date/preference combination.</p>'}
  </div>`;
    } else if (activeTab === 'cruise') {
      categorySection = `<p class="empty">No cruise line data has been researched yet &mdash; spec section 4 lists "cruise line" as a booking-link category, but nothing here fabricates itineraries or pricing without a real source. This tab will populate once that research pass happens.</p>`;
    } else {
      const items = getDestinationsByCategory(activeTab, startDate);
      categorySection = `
  <p class="sub">Seasonal fit is computed for ${esc(startDate)} &mdash; change the date on the Discover tab to see how it shifts.</p>
  <div class="grid">
    ${items.length ? items.map(renderCategoryCard).join('') : '<p class="empty">No catalog entries for this category yet.</p>'}
  </div>`;
    }

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Travel Intelligence Agent</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" />
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0 0 48px; background: ${BG}; color: ${INK}; font: 15px/1.55 'Space Grotesk', -apple-system, sans-serif; }
  main { padding: 0 40px; }
  .masthead { padding: 36px 40px 0; }
  .masthead-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .eyebrow { display: flex; align-items: center; gap: 10px; font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: .1em; color: ${MUTED}; }
  .eyebrow-dot { width: 10px; height: 10px; border-radius: 999px; background: ${OLIVE}; display: inline-block; }
  .home { font-family: 'Space Mono', monospace; font-size: 11px; color: ${MUTED}; }
  h1 { font-size: 32px; font-weight: 700; letter-spacing: -.01em; margin: 4px 0 22px; }
  h2 { font-size: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: ${INK}; margin: 34px 0 16px; padding-left: 12px; border-left: 4px solid ${OLIVE}; }
  .sub { color: ${MUTED}; margin: 0 0 24px; font-size: 13px; }
  .tabs { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0 30px; border-bottom: 1px solid ${BORDER}; }
  .tab { color: ${MUTED}; text-decoration: none; font-size: 12px; font-weight: 600; padding: 9px 14px; background: transparent; border-bottom: 2px solid transparent; margin-bottom: -1px; }
  .tab.active { color: ${INK}; border-bottom-color: ${OLIVE}; }
  .tab:hover:not(.active) { color: ${INK}; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
  .card { background: ${CARD}; border: 1px solid ${BORDER}; border-radius: 6px; padding: 20px; }
  .card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
  .card-head h3 { margin: 0; font-size: 16px; font-weight: 700; }
  .score { font-family: 'Space Mono', monospace; font-size: 20px; font-weight: 700; color: ${OLIVE}; white-space: nowrap; }
  .badge { font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: .02em; text-transform: uppercase; padding: 4px 9px; border-radius: 4px; white-space: nowrap; }
  .ambig { color: ${CLAY}; font-size: 12px; margin: 8px 0 0; }
  .loc { color: ${MUTED}; font-size: 12px; margin: 10px 0; }
  .reason { color: ${MUTED}; font-size: 12px; line-height: 1.6; margin: 8px 0; }
  .facts { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
  .fact { font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: .02em; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; }
  .fact-yes { background: rgba(107,122,79,.14); color: ${OLIVE}; }
  .fact-no { background: rgba(161,63,63,.12); color: ${RED}; }
  .fact-unk { background: rgba(138,127,110,.14); color: ${MUTED}; }
  .flags { font-size: 12px; color: ${RED}; margin: 8px 0; }
  .meta { display: flex; gap: 14px; font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 400; color: ${MUTED}; margin: 12px 0; flex-wrap: wrap; }
  .booking { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
  .btn { background: ${INK}; color: ${CARD}; text-decoration: none; font-size: 11px; font-weight: 700; letter-spacing: .02em; text-transform: uppercase; padding: 8px 14px; border-radius: 4px; }
  .btn-disabled { color: ${MUTED}; font-size: 11px; font-style: italic; }
  .disclaimer { font-size: 10px; color: ${MUTED}; margin: 8px 0 0; }
  details { margin-top: 12px; font-size: 12px; }
  summary { cursor: pointer; color: ${CLAY}; font-size: 11px; font-weight: 600; letter-spacing: .02em; text-transform: uppercase; }
  details ul { margin: 8px 0; padding-left: 18px; }
  details a { color: ${CLAY}; word-break: break-all; }
  details a:hover { color: ${OLIVE}; }
  .notes { color: ${MUTED}; font-size: 11px; }
  .empty { color: ${MUTED}; font-size: 13px; }
  .trip-form { display: flex; flex-wrap: wrap; align-items: center; gap: 18px; background: ${CARD}; border: 1px solid ${BORDER}; border-radius: 6px; padding: 20px; margin-bottom: 10px; }
  .trip-form label { font-size: 12px; color: ${INK}; display: flex; align-items: center; gap: 8px; }
  .trip-form input[type="date"] { background: ${BG}; border: 1px solid ${BORDER}; border-radius: 4px; color: ${INK}; padding: 6px 10px; font-family: inherit; }
  .trip-form fieldset { border: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
  .trip-form legend { font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 400; letter-spacing: .04em; text-transform: uppercase; color: ${MUTED}; padding: 0; margin-bottom: 6px; }
  .chip { background: transparent; border: 1px solid ${BORDER}; border-radius: 999px; color: ${MUTED}; padding: 6px 12px; font-size: 11px; font-weight: 600; }
  .chip:has(input:checked) { background: ${OLIVE}; border-color: ${OLIVE}; color: #f4f1e8; }
  .submit-btn { border: none; cursor: pointer; font: inherit; background: ${CLAY}; color: #fdf6f2; font-size: 12px; font-weight: 700; letter-spacing: .02em; padding: 10px 20px; border-radius: 4px; }
</style>
</head>
<body>
  <main>
    <header class="masthead">
      <div class="masthead-top">
        <div class="eyebrow"><span class="eyebrow-dot"></span>TRAIL REPORT</div>
        <div class="home">HOME: 55449 MN</div>
      </div>
      <h1>Travel Intelligence Agent</h1>
    </header>

    <nav class="tabs">
      ${TABS.map((t) => `<a class="tab${t.id === activeTab ? ' active' : ''}" href="${tabHref(t.id)}">${esc(t.label)}</a>`).join('')}
    </nav>

    <h2>${esc(TABS.find((t) => t.id === activeTab).label)}</h2>
    ${discoverSection}
    ${campgroundSection}
    ${categorySection}
  </main>
</body>
</html>`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
