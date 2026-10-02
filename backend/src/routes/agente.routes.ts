import { Router } from 'express';
import { AgenteController } from '../controllers/agente.controller.js';

const router = Router();

router.get('/', AgenteController.listar);
router.get('/:id', AgenteController.obterPorId);

export default router;
