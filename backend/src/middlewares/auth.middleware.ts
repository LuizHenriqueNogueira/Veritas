// ========================================================
// Analisador IA - Veritas
// Middleware de Autenticação JWT
// Atende a RN03 e RN04
// ========================================================

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { usuarioRepository } from '../repositories/index.js';

const authService = new AuthService(usuarioRepository);

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Acesso não autorizado. É necessário fornecer um token JWT válido.'
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = authService.verifyToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    res.status(401).json({
      error: 'Sessão inválida ou expirada. Realize o login novamente.'
    });
  }
}
