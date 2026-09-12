/**
 * Bounds client-supplied pagination to stop expensive unbounded queries.
 * Returns safe { page, limit, offset } integers.
 */
function parsePagination(query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) {
    let page = parseInt(query.page, 10);
    let limit = parseInt(query.limit, 10);

    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
    if (limit > maxLimit) limit = maxLimit;

    return { page, limit, offset: (page - 1) * limit };
}

module.exports = { parsePagination };
