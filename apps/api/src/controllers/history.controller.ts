import {Response,NextFunction} from 'express';
import {AuthenticatedRequest} from '../middlewares/auth.middleware.js';
import {analiseRepository,feedbackRepository} from '../repositories/index.js';
import {HistoryService} from '../services/history.service.js';
const history=new HistoryService(analiseRepository,feedbackRepository);
export class HistoryController {
 static async exclude(req:AuthenticatedRequest,res:Response,next:NextFunction){try{res.json(await history.exclude(Number(req.params.id),req.user!.userId));}catch(e){next(e);}}
 static async restore(req:AuthenticatedRequest,res:Response,next:NextFunction){try{res.json(await history.restore(Number(req.params.id),req.user!.userId));}catch(e){next(e);}}
 static async feedback(req:AuthenticatedRequest,res:Response,next:NextFunction){try{res.json(await history.getFeedback(Number(req.params.id),req.user!.userId));}catch(e){next(e);}}
 static async saveFeedback(req:AuthenticatedRequest,res:Response,next:NextFunction){try{res.json(await history.saveFeedback(Number(req.params.id),req.user!.userId,req.body.util,req.body.comentario));}catch(e){next(e);}}
}
