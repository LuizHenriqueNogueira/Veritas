import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { usuarioRepository } from '../repositories/index.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

const authService = new AuthService(usuarioRepository);

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nome, email, senha } = req.body;
      const resultado = await authService.register({ nome, email, senha });
      res.status(201).json(resultado);
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, senha } = req.body;
      const resultado = await authService.login({ email, senha });
      res.status(200).json(resultado);
    } catch (err) {
      next(err);
    }
  }

  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ erro: 'Não autenticado.' });
        return;
      }
      const usuario = await usuarioRepository.findById(req.user.userId);
      if (!usuario) {
        res.status(404).json({ erro: 'Usuário não encontrado.' });
        return;
      }
      res.json({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        data_cadastro: usuario.data_cadastro
      });
    } catch (err) {
      next(err);
    }
  }
}
