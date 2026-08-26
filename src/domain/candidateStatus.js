/**
 * Phase 2 "candidate statuses" lifecycle: CANDIDATE / RESEARCHING / VALIDATED / RECOMMENDED /
 * STRETCH / EXCLUDED / UNVERIFIED. Distinct from bookingStatus (Phase 6's RESEARCH_ONLY /
 * BOOKING_READY / etc, which is about whether a booking link is actionable) — this is about
 * whether a candidate actually clears the traveler's own budget/travel-time/qualification rules.
 *
 * This only ever demotes/excludes based on real, known facts. A candidate with no real cost or
 * travel-time data yet (every non-camping row today, since Phase 3/4's live adapters don't exist)
 * lands on UNVERIFIED rather than being guessed into RECOMMENDED or silently dropped.
 */

const CANDIDATE_STATUS = Object.freeze({
  CANDIDATE: 'CANDIDATE',
  RESEARCHING: 'RESEARCHING',
  VALIDATED: 'VALIDATED',
  RECOMMENDED: 'RECOMMENDED',
  STRETCH: 'STRETCH',
  EXCLUDED: 'EXCLUDED',
  UNVERIFIED: 'UNVERIFIED',
});

// Lower rank surfaces first in the default ranking — see dealBoard.js's tiered sort.
const CANDIDATE_STATUS_RANK = Object.freeze({
  [CANDIDATE_STATUS.RECOMMENDED]: 0,
  [CANDIDATE_STATUS.STRETCH]: 1,
  [CANDIDATE_STATUS.VALIDATED]: 2,
  [CANDIDATE_STATUS.CANDIDATE]: 3,
  [CANDIDATE_STATUS.UNVERIFIED]: 4,
  [CANDIDATE_STATUS.RESEARCHING]: 4,
  [CANDIDATE_STATUS.EXCLUDED]: 5,
});

const STRETCH_BUDGET_TIERS = ['STRETCH_BUDGET', 'PREMIUM_VALUE', 'AT_MAXIMUM'];
const GOOD_BUDGET_TIERS = ['EXCEPTIONAL_VALUE', 'WITHIN_PREFERRED'];

/**
 * budgetStatus / travelTimeStatus: the `.status` string from budgetModel/travelTimeModel.
 * qualificationVerdict: campingQualification's verdict, or null for non-camping candidates.
 * hasRealCost / hasRealTravelTime: whether the underlying number is a real researched/computed
 * value (true) rather than absent because no live adapter exists yet (false).
 */
function deriveCandidateStatus({ budgetStatus, travelTimeStatus, qualificationVerdict, hasRealCost, hasRealTravelTime }) {
  // Hard exclusions always win, regardless of how good anything else looks.
  if (qualificationVerdict === 'CONDITIONAL_FAILED') return CANDIDATE_STATUS.EXCLUDED;
  if (budgetStatus === 'OVER_BUDGET') return CANDIDATE_STATUS.EXCLUDED;
  if (travelTimeStatus === 'EXCLUDED') return CANDIDATE_STATUS.EXCLUDED;

  // Can't validate a mandatory dimension we don't actually have data for yet.
  if (!hasRealCost || !hasRealTravelTime) return CANDIDATE_STATUS.UNVERIFIED;

  const isStretch = STRETCH_BUDGET_TIERS.includes(budgetStatus) || travelTimeStatus === 'STRETCH_TRAVEL_TIME';
  if (isStretch) return CANDIDATE_STATUS.STRETCH;

  const isGoodBudget = GOOD_BUDGET_TIERS.includes(budgetStatus);
  const isGoodTravelTime = travelTimeStatus === 'PREFERRED';
  const qualificationOk = qualificationVerdict == null || qualificationVerdict === 'QUALIFIED';
  if (isGoodBudget && isGoodTravelTime && qualificationOk) return CANDIDATE_STATUS.RECOMMENDED;

  return CANDIDATE_STATUS.VALIDATED;
}

module.exports = { CANDIDATE_STATUS, CANDIDATE_STATUS_RANK, deriveCandidateStatus };
