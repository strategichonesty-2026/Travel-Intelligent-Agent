const express = require('express');
const campgroundService = require('../services/campgroundService');

const router = express.Router();

// GET /campgrounds/favorites — the traveler's persistent favorite list with qualification verdicts
router.get('/favorites', (req, res) => {
  res.json({ results: campgroundService.listFavorites() });
});

// GET /campgrounds/favorites/qualified — only those passing strict site-level qualification
router.get('/favorites/qualified', (req, res) => {
  res.json({ results: campgroundService.getQualifiedFavorites() });
});

// GET /campgrounds/favorites/ranked — value-ranked with BEST VALUE / BEST FACILITIES / BEST CLOSE-TO-HOME labels
router.get('/favorites/ranked', (req, res) => {
  const ranked = campgroundService.rankFavoritesByValue(campgroundService.listFavorites());
  res.json({ results: ranked });
});

// GET /campgrounds/favorites/:id — single record with evidence + qualification detail
router.get('/favorites/:id', (req, res) => {
  const found = campgroundService.findFavoriteById(req.params.id);
  if (!found) return res.status(404).json({ error: 'Campground not found' });
  res.json(found);
});

// GET /campgrounds/favorites/:id/booking — booking status, link validation, and price disclaimer
router.get('/favorites/:id/booking', async (req, res, next) => {
  try {
    const found = campgroundService.findFavoriteById(req.params.id);
    if (!found) return res.status(404).json({ error: 'Campground not found' });
    const booking = await campgroundService.buildBookingInfo(found);
    res.json({ campgroundId: found.id, name: found.name, ...booking });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
