import {Response,NextFunction} from 'express';
import {AuthenticatedRequest} from './auth.middleware.js';
import {usuarioRepository} from '../repositories/index.js';
import {perfilDoUsuario} from '../services/access.service.js';
export async function adminMiddleware(req:AuthenticatedRequest,res:Response,next:NextFunction){
  try{
    if(!req.user){res.status(401).json({erro:'Entre na sua conta para continuar.'});return;}
    const usuario=await usuarioRepository.findById(req.user.userId);
    if(!usuario || perfilDoUsuario(usuario)!=='ADMIN'){res.status(403).json({erro:'Este recurso está disponível apenas para o administrador.'});return;}
    next();
  }catch(error){next(error);}
}
