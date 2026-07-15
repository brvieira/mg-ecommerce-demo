import * as filtersService from '../services/filtersService.js';
import { parseFilters } from './queryHelpers.js';

export async function getFilters(req, res, next) {
  try {
    const { q } = req.query;
    const filters = parseFilters(req.query);
    const result = await filtersService.getFilters({ q, filters });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
