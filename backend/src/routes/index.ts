import { Router } from 'express';
import authRoutes from './auth.routes.js';
import analiseRoutes from './analise.routes.js';
import agenteRoutes from './agente.routes.js';
import ocrRoutes from './ocr.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/analises', analiseRoutes);
router.use('/agentes', agenteRoutes);
router.use('/ocr', ocrRoutes);

router.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    aplicacao: 'Analisador IA - Veritas',
    versao: '1.0.0',
    data_hora: new Date().toISOString()
  });
});

export default router;
