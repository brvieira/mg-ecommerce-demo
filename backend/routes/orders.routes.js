import { Router } from 'express';
import * as ordersController from '../controllers/ordersController.js';

const router = Router();

router.post('/', ordersController.create);

export default router;
