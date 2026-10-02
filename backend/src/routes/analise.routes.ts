import { Router } from 'express';
import { AnaliseController } from '../controllers/analise.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas as rotas de análise exigem autenticação do usuário (RN03, RN04)
router.use(authMiddleware);

router.post('/', AnaliseController.criar);
router.get('/', AnaliseController.listar);
router.get('/:id', AnaliseController.obterPorId);

export default router;
