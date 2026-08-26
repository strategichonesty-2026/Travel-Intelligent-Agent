/**
 * Three-tier budget classification (spec: "BUDGET MODEL" / "BUDGET STRETCH CONTROL"). Never
 * ranks a more expensive option higher purely for being more expensive — this only labels where
 * a total cost falls relative to the traveler's own configured tiers.
 */

const BUDGET_STATUS = Object.freeze({
  EXCEPTIONAL_VALUE: 'EXCEPTIONAL_VALUE',
  WITHIN_PREFERRED: 'WITHIN_PREFERRED',
  STRETCH_BUDGET: 'STRETCH_BUDGET',
  PREMIUM_VALUE: 'PREMIUM_VALUE',
  AT_MAXIMUM: 'AT_MAXIMUM',
  OVER_BUDGET: 'OVER_BUDGET',
  UNVERIFIED: 'UNVERIFIED',
});

const BUDGET_LABEL = Object.freeze({
  [BUDGET_STATUS.EXCEPTIONAL_VALUE]: 'Exceptional Value',
  [BUDGET_STATUS.WITHIN_PREFERRED]: 'Within Preferred Budget',
  [BUDGET_STATUS.STRETCH_BUDGET]: 'Stretch Budget',
  [BUDGET_STATUS.PREMIUM_VALUE]: 'Premium Value',
  [BUDGET_STATUS.AT_MAXIMUM]: 'At Maximum',
  [BUDGET_STATUS.OVER_BUDGET]: 'Over Budget',
  [BUDGET_STATUS.UNVERIFIED]: 'Unverified',
});

/**
 * totalCost: number | null/undefined (null when no live pricing exists yet — returns UNVERIFIED,
 * never a guessed tier).
 * budget: profile.budget shape — { preferred: {min,max}, stretch: {enabled,max}, absoluteMax }
 */
function classifyBudget(totalCost, budget) {
  if (typeof totalCost !== 'number' || Number.isNaN(totalCost)) {
    return { status: BUDGET_STATUS.UNVERIFIED, label: BUDGET_LABEL[BUDGET_STATUS.UNVERIFIED] };
  }

  const { preferred, stretch, absoluteMax } = budget;

  if (totalCost > absoluteMax) {
    return { status: BUDGET_STATUS.OVER_BUDGET, label: BUDGET_LABEL[BUDGET_STATUS.OVER_BUDGET] };
  }
  if (totalCost < preferred.min) {
    return { status: BUDGET_STATUS.EXCEPTIONAL_VALUE, label: BUDGET_LABEL[BUDGET_STATUS.EXCEPTIONAL_VALUE] };
  }
  if (totalCost <= preferred.max) {
    return { status: BUDGET_STATUS.WITHIN_PREFERRED, label: BUDGET_LABEL[BUDGET_STATUS.WITHIN_PREFERRED] };
  }
  if (stretch.enabled && totalCost <= stretch.max) {
    return { status: BUDGET_STATUS.STRETCH_BUDGET, label: BUDGET_LABEL[BUDGET_STATUS.STRETCH_BUDGET] };
  }

  // Above the preferred/stretch ceiling but still <= absoluteMax. The spec asks for a distinct
  // "At Maximum" label near the ceiling vs. "Premium Value" further below it; the exact cutover
  // point isn't specified numerically, so this uses the top quarter of the remaining headroom
  // above stretch (or preferred, if stretch is off) as "At Maximum" — a documented judgment call,
  // not a spec-given threshold.
  const floor = stretch.enabled ? stretch.max : preferred.max;
  const nearMaxThreshold = absoluteMax - (absoluteMax - floor) * 0.25;
  if (totalCost >= nearMaxThreshold) {
    return { status: BUDGET_STATUS.AT_MAXIMUM, label: BUDGET_LABEL[BUDGET_STATUS.AT_MAXIMUM] };
  }
  return { status: BUDGET_STATUS.PREMIUM_VALUE, label: BUDGET_LABEL[BUDGET_STATUS.PREMIUM_VALUE] };
}

module.exports = { BUDGET_STATUS, BUDGET_LABEL, classifyBudget };
