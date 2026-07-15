import * as searchService from '../services/searchService.js';
import { parsePagination, parseFilters } from './queryHelpers.js';

export async function search(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'q is required' });
    }

    const { page, limit } = parsePagination(req.query);
    const filters = parseFilters(req.query);
    const { items, total, tookMs } = await searchService.search({ q, filters, page, limit });

    res.json({
      diagnostics: { tookMs, total, resultCount: items.length },
      page,
      limit,
      items,
    });
  } catch (err) {
    next(err);
  }
}
