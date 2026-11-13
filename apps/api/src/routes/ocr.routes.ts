import { Router } from 'express';
import { OCRController } from '../controllers/ocr.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/iniciar', OCRController.iniciarCaptura);
router.post('/capturar-regiao', OCRController.capturarRegiao);
router.post('/reconhecer', OCRController.reconhecerTexto);

export default router;
