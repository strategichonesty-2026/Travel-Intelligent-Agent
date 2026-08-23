const express = require('express');
const { getAutomaticRecommendations } = require('../services/recommendationService');

const router = express.Router();

/**
 * POST /recommendations
 * body: { startDate, endDate, budget, travelers, preferences: string[], weights?: {...} }
 * Spec sections 3, 28: no destination required.
 */
router.post('/', async (req, res, next) => {
  try {
    const { startDate, endDate, budget, travelers, preferences, weights } = req.body || {};
    if (!startDate) {
      return res.status(400).json({ error: 'startDate is required' });
    }
    const results = await getAutomaticRecommendations(
      { startDate, endDate, budget, travelers, preferences },
      { weightOverrides: weights },
    );
    res.json({ count: results.length, results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
