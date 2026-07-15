import { Router } from 'express';
import * as productsController from '../controllers/productsController.js';

const router = Router();

router.get('/', productsController.list);
router.post('/', productsController.create);
router.get('/:id/similar', productsController.getSimilar);
router.get('/:id', productsController.getById);
router.put('/:id', productsController.update);

export default router;
