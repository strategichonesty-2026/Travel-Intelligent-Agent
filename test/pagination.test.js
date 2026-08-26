const { test } = require('node:test');
const assert = require('node:assert/strict');
const { paginate } = require('../src/domain/pagination');

test('paginate: first page of a set larger than the page size', () => {
  const p = paginate(60, 1, 25);
  assert.equal(p.page, 1);
  assert.equal(p.totalPages, 3);
  assert.equal(p.startIndex, 0);
  assert.equal(p.endIndex, 25);
  assert.equal(p.pageStart, 1);
  assert.equal(p.pageEnd, 25);
  assert.equal(p.hasPrevious, false);
  assert.equal(p.hasNext, true);
});

test('paginate: middle page', () => {
  const p = paginate(60, 2, 25);
  assert.equal(p.startIndex, 25);
  assert.equal(p.endIndex, 50);
  assert.equal(p.pageStart, 26);
  assert.equal(p.pageEnd, 50);
  assert.equal(p.hasPrevious, true);
  assert.equal(p.hasNext, true);
});

test('paginate: last (partial) page', () => {
  const p = paginate(60, 3, 25);
  assert.equal(p.startIndex, 50);
  assert.equal(p.endIndex, 60);
  assert.equal(p.pageStart, 51);
  assert.equal(p.pageEnd, 60);
  assert.equal(p.hasPrevious, true);
  assert.equal(p.hasNext, false);
});

test('paginate: requesting a page beyond the end clamps to the last real page', () => {
  const p = paginate(60, 99, 25);
  assert.equal(p.page, 3);
  assert.equal(p.hasNext, false);
});

test('paginate: requesting page 0 or negative clamps to page 1', () => {
  assert.equal(paginate(60, 0, 25).page, 1);
  assert.equal(paginate(60, -5, 25).page, 1);
});

test('paginate: a set smaller than the page size is a single page with no Next', () => {
  const p = paginate(24, 1, 25);
  assert.equal(p.totalPages, 1);
  assert.equal(p.hasNext, false);
  assert.equal(p.pageEnd, 24);
});

test('paginate: zero rows is still a valid single page (no crash, no negative pageStart)', () => {
  const p = paginate(0, 1, 25);
  assert.equal(p.totalPages, 1);
  assert.equal(p.pageStart, 0);
  assert.equal(p.pageEnd, 0);
  assert.equal(p.hasNext, false);
});
