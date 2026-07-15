import { Router } from 'express';
import * as filtersController from '../controllers/filtersController.js';

const router = Router();

router.get('/', filtersController.getFilters);

export default router;
