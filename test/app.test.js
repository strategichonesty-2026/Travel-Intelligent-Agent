const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { createApp } = require('../src/app');
const profileService = require('../src/services/profileService');

afterEach(() => {
  try {
    fs.unlinkSync(profileService.STORE_PATH);
  } catch {
    // already clean
  }
});

test('GET /health returns ok status', async () => {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://localhost:${port}/health`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(body, { status: 'ok' });
  } finally {
    server.close();
  }
});

test('GET /campgrounds/favorites lists the researched favorite campground records', async () => {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://localhost:${port}/campgrounds/favorites`);
    const body = await res.json();
    assert.equal(res.status, 200);
    // 14 requested names, some ambiguous (Two Rivers x4) or split by site tier (Shell Lake x2)
    assert.equal(body.results.length, 17);
    assert.ok(body.results.every((c) => c.qualification));
    assert.ok(body.results.some((c) => c.resolvedName.includes('Shell Lake') && c.qualification.verdict === 'QUALIFIED'));
  } finally {
    server.close();
  }
});

test('GET /campgrounds/discover lists similar campgrounds beyond the favorite list', async () => {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://localhost:${port}/campgrounds/discover`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(body.results.length >= 4);
    assert.ok(body.results.every((c) => c.qualification));
  } finally {
    server.close();
  }
});

test('GET /campgrounds/favorites/:id/booking never returns a booking link that was not sourced', async () => {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const favRes = await fetch(`http://localhost:${port}/campgrounds/favorites`);
    const { results } = await favRes.json();
    const pettibone = results.find((c) => c.resolvedName.includes('Pettibone'));
    const res = await fetch(`http://localhost:${port}/campgrounds/favorites/${pettibone.id}/booking`);
    const body = await res.json();
    assert.equal(res.status, 200);
    // Pettibone has no online reservation system (phone-only) — must never fabricate a URL
    assert.equal(body.bookingUrl, null);
    assert.equal(body.bookingStatus, 'RESEARCH_ONLY');
  } finally {
    server.close();
  }
});

test('POST /recommendations requires a startDate', async () => {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://localhost:${port}/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  } finally {
    server.close();
  }
});

test('POST /recommendations returns seasonally-appropriate camping candidates for a June trip', async () => {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://localhost:${port}/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: '2026-06-20',
        endDate: '2026-06-23',
        budget: 1000,
        travelers: 2,
        preferences: ['Camping', 'Scenery', 'Waterfront'],
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(body.results.length > 0);
    assert.ok(body.results.every((r) => r.bookingStatus === 'RESEARCH_ONLY'));
  } finally {
    server.close();
  }
});

test('GET / (Discover tab) renders the deal desk table with profile summary and quick actions', async () => {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://localhost:${port}/?tab=discover`);
    const html = await res.text();
    assert.equal(res.status, 200);
    assert.match(html, /HOME: 55449/);
    assert.match(html, /TRAVELERS: 2 ADULTS/);
    assert.match(html, /Find Me the Best Deal/);
    assert.match(html, /Find Camping/);
    assert.match(html, /class="deal-table"/);
    assert.match(html, /Shell Lake/);
  } finally {
    server.close();
  }
});

test('GET /?tab=discover&filter=camping only shows camping rows', async () => {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://localhost:${port}/?tab=discover&filter=camping`);
    const html = await res.text();
    assert.equal(res.status, 200);
    assert.match(html, /Shell Lake/);
    // A warm-escape-only destination should not appear when filtered to camping.
    assert.doesNotMatch(html, /Cancun/);
  } finally {
    server.close();
  }
});

test('GET /?tab=profile renders the editable profile form with current values', async () => {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://localhost:${port}/?tab=profile`);
    const html = await res.text();
    assert.equal(res.status, 200);
    assert.match(html, /class="profile-form"/);
    assert.match(html, /name="budget\.preferred\.min"/);
    assert.match(html, /name="travelTime\.stretch\.max"/);
  } finally {
    server.close();
  }
});

test('POST /profile updates the profile and the change is reflected on reload', async () => {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const postRes = await fetch(`http://localhost:${port}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ travelers: '3', 'budget.preferred.max': '2500' }).toString(),
      redirect: 'manual',
    });
    assert.equal(postRes.status, 302);

    const profileRes = await fetch(`http://localhost:${port}/api/profile`);
    const profile = await profileRes.json();
    assert.equal(profile.travelers, 3);
    assert.equal(profile.budget.preferred.max, 2500);
  } finally {
    server.close();
  }
});

test('GET/PUT /api/profile round-trips a partial update', async () => {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const putRes = await fetch(`http://localhost:${port}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ travelTime: { preferred: 4 } }),
    });
    assert.equal(putRes.status, 200);
    const updated = await putRes.json();
    assert.equal(updated.travelTime.preferred, 4);

    const getRes = await fetch(`http://localhost:${port}/api/profile`);
    const fetched = await getRes.json();
    assert.equal(fetched.travelTime.preferred, 4);
  } finally {
    server.close();
  }
});

test('PUT /api/profile rejects an inconsistent budget rather than silently accepting it', async () => {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://localhost:${port}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budget: { preferred: { min: 9000, max: 100 } } }),
    });
    assert.equal(res.status, 400);
  } finally {
    server.close();
  }
});

test('GET /scoring/weights returns default trip and camping weights', async () => {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://localhost:${port}/scoring/weights`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(body.trip.totalCost);
    assert.ok(body.camping.hookupQuality);
  } finally {
    server.close();
  }
});
