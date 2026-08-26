const express = require('express');
const campgroundService = require('../services/campgroundService');
const profileService = require('../services/profileService');
const { buildDealBoard } = require('../services/dealBoard');
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
  { id: 'profile', label: 'Profile' },
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

const BUDGET_STATUS_STYLE = {
  EXCEPTIONAL_VALUE: { bg: OLIVE, fg: '#f4f1e8' },
  WITHIN_PREFERRED: { bg: 'rgba(107,122,79,.16)', fg: OLIVE },
  STRETCH_BUDGET: { bg: 'rgba(181,88,58,.14)', fg: CLAY },
  PREMIUM_VALUE: { bg: 'rgba(181,88,58,.14)', fg: CLAY },
  AT_MAXIMUM: { bg: 'rgba(161,63,63,.14)', fg: RED },
  OVER_BUDGET: { bg: RED, fg: '#f9eeee' },
  UNVERIFIED: { bg: BORDER, fg: MUTED },
};

const TRAVEL_TIME_STATUS_STYLE = {
  PREFERRED: { bg: 'rgba(107,122,79,.16)', fg: OLIVE },
  STRETCH_TRAVEL_TIME: { bg: 'rgba(181,88,58,.14)', fg: CLAY },
  LONG_TRAVEL_TIME: { bg: 'rgba(161,63,63,.14)', fg: RED },
  EXCLUDED: { bg: RED, fg: '#f9eeee' },
  UNVERIFIED: { bg: BORDER, fg: MUTED },
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

function badge(label, style) {
  return `<span class="badge" style="background:${style.bg};color:${style.fg}">${esc(label)}</span>`;
}

function renderDealRow(row) {
  const budgetStyle = BUDGET_STATUS_STYLE[row.budgetStatus.status] || BUDGET_STATUS_STYLE.UNVERIFIED;
  const timeStyle = TRAVEL_TIME_STATUS_STYLE[row.travelTimeStatus.status] || TRAVEL_TIME_STATUS_STYLE.UNVERIFIED;
  const bookingStyle = STATUS_STYLE[row.bookingStatus] || STATUS_STYLE.RESEARCH_ONLY;
  const costText = row.totalCost.amount != null ? `$${row.totalCost.amount.toLocaleString()}` : 'UNVERIFIED';

  return `
  <tr>
    <td class="num">${row.rank}</td>
    <td class="dest">
      <a href="${esc(row.detailHref)}">${esc(row.destination)}</a>
      <span class="mini">${esc(row.tripType.replace(/_/g, ' '))}</span>
    </td>
    <td>${esc(row.dates)}</td>
    <td>${esc(row.duration)}</td>
    <td>${esc(row.flightSummary)}</td>
    <td>${esc(row.lodging)}</td>
    <td class="num">${costText}<span class="mini">${row.totalCost.label !== 'UNVERIFIED' ? row.totalCost.label : ''}</span></td>
    <td>${badge(row.budgetStatus.label, budgetStyle)}</td>
    <td>${badge(row.travelTimeStatus.label, timeStyle)}${row.travelTimeStatus.hours != null ? `<span class="mini">${row.travelTimeStatus.hours}h</span>` : ''}</td>
    <td class="num">${row.valueScore != null ? row.valueScore : '—'}</td>
    <td>${esc(row.evidenceStatus)}</td>
    <td>${badge(row.bookingStatus.replace(/_/g, ' '), bookingStyle)}</td>
    <td>${row.bookingUrl ? `<a class="btn-sm" href="${esc(row.bookingUrl)}" target="_blank" rel="noopener">Book</a>` : `<a class="btn-sm-outline" href="${esc(row.detailHref)}">View</a>`}</td>
  </tr>`;
}

const SORTABLE_COLUMNS = [
  { key: null, label: 'Rank' },
  { key: null, label: 'Destination' },
  { key: null, label: 'Dates' },
  { key: null, label: 'Duration' },
  { key: null, label: 'Flight' },
  { key: null, label: 'Lodging/Camping' },
  { key: 'cost', label: 'Total Cost' },
  { key: null, label: 'Budget' },
  { key: 'travelTime', label: 'Travel Time' },
  { key: 'value', label: 'Value' },
  { key: null, label: 'Evidence' },
  { key: null, label: 'Booking' },
  { key: null, label: 'Action' },
];

function renderDealTable(rows, { sort, dir, sortHref }) {
  return `
  <div class="table-wrap">
  <table class="deal-table">
    <thead>
      <tr>
        ${SORTABLE_COLUMNS.map((c) => {
    if (!c.key) return `<th>${esc(c.label)}</th>`;
    const active = sort === c.key;
    const arrow = active ? (dir === 'asc' ? ' ↑' : ' ↓') : '';
    return `<th><a class="sort-link${active ? ' active' : ''}" href="${sortHref(c.key)}">${esc(c.label)}${arrow}</a></th>`;
  }).join('')}
      </tr>
    </thead>
    <tbody>
      ${rows.length ? rows.map(renderDealRow).join('') : `<tr><td colspan="${SORTABLE_COLUMNS.length}" class="empty">No candidates matched this filter/date/preference combination.</td></tr>`}
    </tbody>
  </table>
  </div>`;
}

const QUICK_ACTIONS = [
  { label: 'Find Me the Best Deal', filter: 'all' },
  { label: 'Find Camping', filter: 'camping' },
  { label: 'Find a Warm Getaway', filter: 'warm' },
  { label: 'Find a Road Trip', filter: 'roadtrip' },
];

// --- Profile form helpers -------------------------------------------------

const NUMBER_FIELDS = new Set([
  'travelers', 'roomCount', 'foodBudgetPerPersonPerDay',
  'budget.preferred.min', 'budget.preferred.max', 'budget.stretch.max', 'budget.absoluteMax',
  'travelTime.preferred', 'travelTime.stretch.max', 'travelTime.absoluteMax',
  'tripLength.preferred', 'tripLength.stretch.min', 'tripLength.stretch.max', 'tripLength.max',
  'vehicle.mpg', 'vehicle.fuelPricePerGallon', 'flight.maxConnections',
]);
const BOOLEAN_FIELDS = new Set(['budget.stretch.enabled', 'travelTime.stretch.enabled']);

function setDeep(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] || {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function formToProfilePartial(body) {
  const partial = {};
  for (const [key, raw] of Object.entries(body || {})) {
    if (raw === '' || raw == null) continue;
    let value = raw;
    if (NUMBER_FIELDS.has(key)) {
      value = Number(raw);
      if (Number.isNaN(value)) continue;
    } else if (BOOLEAN_FIELDS.has(key)) {
      value = raw === 'true';
    }
    setDeep(partial, key, value);
  }
  return partial;
}

function field(label, name, value, { type = 'text', step, hint } = {}) {
  return `
    <label class="field">
      <span>${esc(label)}</span>
      <input type="${type}" name="${esc(name)}" value="${esc(value)}" ${step ? `step="${step}"` : ''} />
      ${hint ? `<small>${esc(hint)}</small>` : ''}
    </label>`;
}

function boolField(label, name, value) {
  return `
    <label class="field">
      <span>${esc(label)}</span>
      <select name="${esc(name)}">
        <option value="true" ${value ? 'selected' : ''}>ON</option>
        <option value="false" ${!value ? 'selected' : ''}>OFF</option>
      </select>
    </label>`;
}

function renderProfileForm(profile, saved) {
  return `
  ${saved ? '<p class="saved-note">Profile saved.</p>' : ''}
  <form class="profile-form" method="post" action="/profile">
    <fieldset>
      <legend>Basics</legend>
      ${field('Travelers', 'travelers', profile.travelers, { type: 'number' })}
      ${field('Home ZIP', 'homeZip', profile.homeZip)}
      ${field('Primary airport', 'airport', profile.airport)}
      ${field('Room count', 'roomCount', profile.roomCount, { type: 'number' })}
      ${field('Preferred bed', 'preferredBed', profile.preferredBed)}
      ${field('Rental car', 'rentalCar', profile.rentalCar)}
      ${field('Food budget / person / day ($, estimated)', 'foodBudgetPerPersonPerDay', profile.foodBudgetPerPersonPerDay, { type: 'number' })}
    </fieldset>

    <fieldset>
      <legend>Budget</legend>
      <p class="hint">Preferred Budget [ $${profile.budget.preferred.min} — $${profile.budget.preferred.max} ] · Allow Stretch [ ${profile.budget.stretch.enabled ? 'ON' : 'OFF'} ] · Stretch Max [ $${profile.budget.stretch.max} ] · Absolute Max [ $${profile.budget.absoluteMax} ]</p>
      ${field('Preferred min ($)', 'budget.preferred.min', profile.budget.preferred.min, { type: 'number' })}
      ${field('Preferred max ($)', 'budget.preferred.max', profile.budget.preferred.max, { type: 'number' })}
      ${boolField('Allow stretch', 'budget.stretch.enabled', profile.budget.stretch.enabled)}
      ${field('Stretch max ($)', 'budget.stretch.max', profile.budget.stretch.max, { type: 'number' })}
      ${field('Absolute max ($)', 'budget.absoluteMax', profile.budget.absoluteMax, { type: 'number' })}
    </fieldset>

    <fieldset>
      <legend>Travel time</legend>
      <p class="hint">Preferred [ ${profile.travelTime.preferred}h ] · Allow Stretch [ ${profile.travelTime.stretch.enabled ? 'ON' : 'OFF'} ] · Stretch [ ${profile.travelTime.stretch.max}h ] · Absolute Max [ ${profile.travelTime.absoluteMax}h ]</p>
      ${field('Preferred (hours)', 'travelTime.preferred', profile.travelTime.preferred, { type: 'number', step: '0.5' })}
      ${boolField('Allow stretch', 'travelTime.stretch.enabled', profile.travelTime.stretch.enabled)}
      ${field('Stretch max (hours)', 'travelTime.stretch.max', profile.travelTime.stretch.max, { type: 'number', step: '0.5' })}
      ${field('Absolute max (hours)', 'travelTime.absoluteMax', profile.travelTime.absoluteMax, { type: 'number', step: '0.5' })}
    </fieldset>

    <fieldset>
      <legend>Trip length</legend>
      ${field('Preferred nights', 'tripLength.preferred', profile.tripLength.preferred, { type: 'number' })}
      ${field('Stretch min nights', 'tripLength.stretch.min', profile.tripLength.stretch.min, { type: 'number' })}
      ${field('Stretch max nights', 'tripLength.stretch.max', profile.tripLength.stretch.max, { type: 'number' })}
      ${field('Max nights', 'tripLength.max', profile.tripLength.max, { type: 'number' })}
    </fieldset>

    <fieldset>
      <legend>Flight schedule</legend>
      ${field('Preferred flight type', 'flight.preferredType', profile.flight.preferredType)}
      ${field('Max connections (when materially better)', 'flight.maxConnections', profile.flight.maxConnections, { type: 'number' })}
      ${field('Outbound day', 'flight.outboundDay', profile.flight.outboundDay)}
      ${field('Outbound departs after', 'flight.outboundDepartAfter', profile.flight.outboundDepartAfter)}
      ${field('Return day', 'flight.returnDay', profile.flight.returnDay)}
      ${field('Return arrival target', 'flight.returnArrivalTarget', profile.flight.returnArrivalTarget)}
    </fieldset>

    <fieldset>
      <legend>Vehicle &amp; fuel (feeds ESTIMATED camping drive costs only)</legend>
      ${field('Vehicle MPG', 'vehicle.mpg', profile.vehicle.mpg, { type: 'number' })}
      ${field('Fuel price ($/gal)', 'vehicle.fuelPricePerGallon', profile.vehicle.fuelPricePerGallon, { type: 'number', step: '0.01' })}
    </fieldset>

    <button type="submit" class="submit-btn">Save profile</button>
  </form>
  <details class="camping-prefs">
    <summary>Camping style profile (learned from your examples — editable via API for now)</summary>
    <ul>
      ${Object.entries(profile.campingPreferences).map(([k, v]) => `<li><strong>${esc(k)}:</strong> ${esc(v)}</li>`).join('')}
    </ul>
    <p class="disclaimer">A dedicated UI for editing these individually is planned for a later phase; for now, PUT partial updates to /api/profile (e.g. {"campingPreferences":{"riverfront":"strongly_preferred"}}).</p>
  </details>`;
}

// --- Routes ----------------------------------------------------------------

router.post('/profile', (req, res, next) => {
  try {
    profileService.updateProfile(formToProfilePartial(req.body));
    res.redirect('/?tab=profile&saved=1');
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const activeTab = TABS.some((t) => t.id === req.query.tab) ? req.query.tab : 'discover';
    const startDate = typeof req.query.startDate === 'string' && req.query.startDate ? req.query.startDate : '';
    const selectedPrefs = Array.isArray(req.query.preferences)
      ? req.query.preferences
      : typeof req.query.preferences === 'string' && req.query.preferences
        ? req.query.preferences.split(',').map((p) => p.trim()).filter(Boolean)
        : [];
    const filter = ['all', 'camping', 'warm', 'roadtrip'].includes(req.query.filter) ? req.query.filter : 'all';
    const sort = ['value', 'cost', 'travelTime'].includes(req.query.sort) ? req.query.sort : 'value';
    const dir = req.query.dir === 'asc' ? 'asc' : 'desc';

    const profile = profileService.getProfile();

    function tabHref(tabId) {
      const params = new URLSearchParams();
      params.set('tab', tabId);
      if (startDate) params.set('startDate', startDate);
      for (const p of selectedPrefs) params.append('preferences', p);
      return `?${params.toString()}`;
    }

    function quickActionHref(qFilter) {
      const params = new URLSearchParams();
      params.set('tab', 'discover');
      params.set('filter', qFilter);
      if (startDate) params.set('startDate', startDate);
      return `?${params.toString()}`;
    }

    function sortHref(key) {
      const nextDir = sort === key && dir === 'desc' ? 'asc' : 'desc';
      const params = new URLSearchParams();
      params.set('tab', 'discover');
      params.set('filter', filter);
      params.set('sort', key);
      params.set('dir', nextDir);
      if (startDate) params.set('startDate', startDate);
      for (const p of selectedPrefs) params.append('preferences', p);
      return `?${params.toString()}`;
    }

    let campgroundSection = '';
    let discoverSection = '';
    let categorySection = '';
    let profileSection = '';

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
      const rows = await buildDealBoard({ profile, startDate: startDate || undefined, preferences: selectedPrefs, filter, sort, dir });

      discoverSection = `
  <div class="quick-actions">
    ${QUICK_ACTIONS.map((a) => `<a class="quick-action${filter === a.filter ? ' active' : ''}" href="${quickActionHref(a.filter)}">${esc(a.label)}</a>`).join('')}
    <span class="quick-action disabled" title="Coming in a later phase (Phase 10)">View Saved Trips</span>
  </div>

  <form class="trip-form" method="get">
    <input type="hidden" name="tab" value="discover" />
    <input type="hidden" name="filter" value="${esc(filter)}" />
    <label>Trip start date <input type="date" name="startDate" value="${esc(startDate)}" placeholder="defaults to next ${esc(profile.flight.outboundDay)}" /></label>
    <fieldset>
      <legend>Preferences</legend>
      ${PREFERENCE_OPTIONS.map((p) => `<label class="chip"><input type="checkbox" name="preferences" value="${esc(p)}" ${selectedPrefs.includes(p) ? 'checked' : ''} /> ${esc(p)}</label>`).join('')}
    </fieldset>
    <button type="submit" class="submit-btn">Refine search</button>
  </form>
  <p class="sub">No destination required &mdash; the deal desk discovers candidates across researched camping data and the curated destination catalog, scored by season, preference match, and (for camping) real computed cost. Flights/hotels have no live adapter configured yet (Phase 3/4), so those columns read UNVERIFIED rather than a guessed number.</p>

  ${renderDealTable(rows, { sort, dir, sortHref })}`;
    } else if (activeTab === 'cruise') {
      categorySection = `<p class="empty">No cruise line data has been researched yet &mdash; spec section 4 lists "cruise line" as a booking-link category, but nothing here fabricates itineraries or pricing without a real source. This tab will populate once that research pass happens.</p>`;
    } else if (activeTab === 'profile') {
      profileSection = renderProfileForm(profile, req.query.saved === '1');
    } else {
      const items = getDestinationsByCategory(activeTab, startDate || todayIso());
      categorySection = `
  <p class="sub">Seasonal fit is computed for ${esc(startDate || todayIso())} &mdash; change the date on the Discover tab to see how it shifts.</p>
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
  .masthead-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; flex-wrap: wrap; gap: 8px; }
  .eyebrow { display: flex; align-items: center; gap: 10px; font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: .1em; color: ${MUTED}; }
  .eyebrow-dot { width: 10px; height: 10px; border-radius: 999px; background: ${OLIVE}; display: inline-block; }
  .profile-summary { font-family: 'Space Mono', monospace; font-size: 11px; color: ${MUTED}; display: flex; gap: 14px; flex-wrap: wrap; }
  .profile-summary a { color: ${CLAY}; text-decoration: none; }
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
  .badge { font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: .02em; text-transform: uppercase; padding: 4px 9px; border-radius: 4px; white-space: nowrap; display: inline-block; }
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
  .empty { color: ${MUTED}; font-size: 13px; padding: 18px 0; }
  .trip-form { display: flex; flex-wrap: wrap; align-items: center; gap: 18px; background: ${CARD}; border: 1px solid ${BORDER}; border-radius: 6px; padding: 20px; margin-bottom: 10px; }
  .trip-form label { font-size: 12px; color: ${INK}; display: flex; align-items: center; gap: 8px; }
  .trip-form input[type="date"] { background: ${BG}; border: 1px solid ${BORDER}; border-radius: 4px; color: ${INK}; padding: 6px 10px; font-family: inherit; }
  .trip-form fieldset { border: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
  .trip-form legend { font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 400; letter-spacing: .04em; text-transform: uppercase; color: ${MUTED}; padding: 0; margin-bottom: 6px; }
  .chip { background: transparent; border: 1px solid ${BORDER}; border-radius: 999px; color: ${MUTED}; padding: 6px 12px; font-size: 11px; font-weight: 600; }
  .chip:has(input:checked) { background: ${OLIVE}; border-color: ${OLIVE}; color: #f4f1e8; }
  .submit-btn { border: none; cursor: pointer; font: inherit; background: ${CLAY}; color: #fdf6f2; font-size: 12px; font-weight: 700; letter-spacing: .02em; padding: 10px 20px; border-radius: 4px; }
  .quick-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
  .quick-action { text-decoration: none; font-size: 12px; font-weight: 600; color: ${INK}; background: ${CARD}; border: 1px solid ${BORDER}; border-radius: 999px; padding: 8px 16px; }
  .quick-action.active { background: ${INK}; color: ${CARD}; border-color: ${INK}; }
  .quick-action.disabled { color: ${MUTED}; cursor: not-allowed; opacity: .6; }
  .table-wrap { overflow-x: auto; border: 1px solid ${BORDER}; border-radius: 6px; background: ${CARD}; }
  .deal-table { width: 100%; border-collapse: collapse; font-size: 12.5px; white-space: nowrap; }
  .deal-table th { text-align: left; padding: 10px 12px; background: ${BG}; border-bottom: 1px solid ${BORDER}; font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: .04em; text-transform: uppercase; color: ${MUTED}; }
  .deal-table td { padding: 10px 12px; border-bottom: 1px solid ${BORDER}; vertical-align: top; }
  .deal-table tr:last-child td { border-bottom: none; }
  .deal-table tr:hover td { background: rgba(107,122,79,.05); }
  .deal-table .num { font-family: 'Space Mono', monospace; }
  .deal-table .dest { white-space: normal; min-width: 160px; }
  .deal-table .dest a { color: ${INK}; text-decoration: none; font-weight: 600; }
  .deal-table .dest a:hover { color: ${CLAY}; }
  .mini { display: block; font-family: 'Space Mono', monospace; font-size: 10px; color: ${MUTED}; margin-top: 2px; }
  .sort-link { color: ${MUTED}; text-decoration: none; }
  .sort-link.active { color: ${INK}; }
  .sort-link:hover { color: ${CLAY}; }
  .btn-sm { background: ${INK}; color: ${CARD}; text-decoration: none; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 4px; }
  .btn-sm-outline { background: transparent; color: ${CLAY}; border: 1px solid ${BORDER}; text-decoration: none; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 4px; }
  .profile-form fieldset { border: 1px solid ${BORDER}; border-radius: 6px; margin: 0 0 16px; padding: 16px; background: ${CARD}; }
  .profile-form legend { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: .04em; text-transform: uppercase; color: ${MUTED}; padding: 0 6px; }
  .profile-form .hint { font-family: 'Space Mono', monospace; font-size: 11px; color: ${MUTED}; margin: 0 0 12px; }
  .profile-form .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; margin-bottom: 10px; margin-right: 14px; }
  .profile-form .field span { color: ${MUTED}; font-size: 11px; }
  .profile-form .field input, .profile-form .field select { background: ${BG}; border: 1px solid ${BORDER}; border-radius: 4px; color: ${INK}; padding: 6px 10px; font-family: inherit; min-width: 160px; }
  .profile-form fieldset { display: flex; flex-wrap: wrap; }
  .profile-form fieldset > legend + .hint { width: 100%; }
  .saved-note { color: ${OLIVE}; font-size: 13px; font-weight: 600; }
  .camping-prefs ul { margin: 10px 0; padding-left: 18px; font-size: 12px; color: ${INK}; }
</style>
</head>
<body>
  <main>
    <header class="masthead">
      <div class="masthead-top">
        <div class="eyebrow"><span class="eyebrow-dot"></span>TRAIL REPORT</div>
        <div class="profile-summary">
          <span>HOME: ${esc(profile.homeZip)}</span>
          <span>TRAVELERS: ${esc(profile.travelers)} ADULTS</span>
          <span>AIRPORT: ${esc(profile.airport)}</span>
          <a href="?tab=profile">Edit profile →</a>
        </div>
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
    ${profileSection}
  </main>
</body>
</html>`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
