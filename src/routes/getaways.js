const express = require('express');
const { searchGetaways } = require('../services/getawayService');
const { STAY_TYPE } = require('../data/getawayStaySources');

const router = express.Router();

/**
 * POST /getaways
 * body: { startDate, endDate?, locationQuery?, stayTypes?: ('RV_RENTAL'|'CAMPSITE'|
 *         'VACATION_RENTAL'|'FARM_STAY')[], budget?, travelTime?, maxDriveHours? }
 * Flexible Getaway Finder (2026-10-09): no destination required, same "dates/budget/preferences
 * in, ranked candidates out" shape as POST /recommendations — this one spans RV rentals,
 * campsites, cabins/vacation rentals, and farm stays instead of flyable destinations.
 */
router.post('/', async (req, res, next) => {
  try {
    const { startDate, endDate, locationQuery, stayTypes, budget, travelTime, maxDriveHours } = req.body || {};
    if (!startDate) {
      return res.status(400).json({ error: 'startDate is required' });
    }
    if (stayTypes && (!Array.isArray(stayTypes) || stayTypes.some((t) => !Object.values(STAY_TYPE).includes(t)))) {
      return res.status(400).json({ error: `stayTypes must be an array of: ${Object.values(STAY_TYPE).join(', ')}` });
    }
    const { candidates, comboStatus } = await searchGetaways({ startDate, endDate, locationQuery, stayTypes, budget, travelTime, maxDriveHours });
    res.json({ count: candidates.length, comboStatus, candidates });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
