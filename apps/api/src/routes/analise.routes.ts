import { Router } from 'express';
import { AnaliseController } from '../controllers/analise.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {HistoryController} from '../controllers/history.controller.js';

const router = Router();

// Todas as rotas de análise exigem autenticação do usuário (RN03, RN04)
router.use(authMiddleware);

router.post('/', AnaliseController.criar);
router.post('/cancelar',AnaliseController.cancelar);
router.delete('/:id',HistoryController.exclude);
router.post('/:id/restaurar',HistoryController.restore);
router.get('/:id/feedback',HistoryController.feedback);
router.put('/:id/feedback',HistoryController.saveFeedback);
router.get('/', AnaliseController.listar);
router.get('/:id', AnaliseController.obterPorId);

export default router;
