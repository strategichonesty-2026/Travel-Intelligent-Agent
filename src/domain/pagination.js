/**
 * Pure pagination math for the deal table (spec follow-up: "first 25 and next"). Kept separate
 * from dashboard.js so it's directly unit-testable without spinning up an HTTP server or needing
 * more than 25 real rows of data.
 */
function paginate(totalRows, requestedPage, pageSize) {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRows);
  return {
    page,
    totalPages,
    startIndex,
    endIndex,
    pageStart: totalRows === 0 ? 0 : startIndex + 1,
    pageEnd: endIndex,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
  };
}

module.exports = { paginate };
