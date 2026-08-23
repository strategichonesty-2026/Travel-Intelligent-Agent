const express = require('express');
const { DEFAULT_TRIP_WEIGHTS, DEFAULT_CAMPING_WEIGHTS, computeWeightedScore, mergeWeights } = require('../domain/scoringEngine');

const router = express.Router();

// GET /scoring/weights — default weighting for trips and camping (spec sections 2, 20)
router.get('/weights', (req, res) => {
  res.json({ trip: DEFAULT_TRIP_WEIGHTS, camping: DEFAULT_CAMPING_WEIGHTS });
});

// POST /scoring/preview — { scores: {...}, weights?: {...}, base?: 'trip'|'camping' }
// Lets a caller try out custom weights (spec section 2: "Allow the user to modify these weights")
// without persisting anything server-side.
router.post('/preview', (req, res) => {
  const { scores, weights, base = 'trip' } = req.body || {};
  if (!scores || typeof scores !== 'object') {
    return res.status(400).json({ error: 'scores object is required' });
  }
  const defaults = base === 'camping' ? DEFAULT_CAMPING_WEIGHTS : DEFAULT_TRIP_WEIGHTS;
  try {
    const finalWeights = mergeWeights(defaults, weights);
    const result = computeWeightedScore(scores, finalWeights);
    res.json({ weights: finalWeights, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
