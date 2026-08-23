const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

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
