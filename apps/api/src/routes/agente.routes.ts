import { factCheckService } from '../services/factcheck/factcheck.service.js';
import { Router } from 'express';
import { configuracaoIA, aiService } from '../services/ai/ai.service.js';
import { reputationService } from '../services/reputation/reputation.service.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {adminMiddleware} from '../middlewares/admin.middleware.js';
import { AgenteController } from '../controllers/agente.controller.js';
const router=Router();
router.get('/',AgenteController.listar);
router.get('/configuracao',authMiddleware,adminMiddleware,(_req,res)=>res.json({...configuracaoIA(),usage:aiService.status(),reputation:reputationService.status(),factcheck:factCheckService.status()}));
router.post('/reputacao/atualizar',authMiddleware,adminMiddleware,async(_req,res,next)=>{
  try{const updated=await reputationService.atualizar();res.status(updated?200:503).json({updated,mensagem:updated?'Há base disponível para consulta. Confira o estado de cada fonte.':'Não foi possível atualizar as bases. Confira a conexão e o painel de administração.',...reputationService.status()});}catch(err){next(err);}
});
router.get('/:id',AgenteController.obterPorId);
export default router;
