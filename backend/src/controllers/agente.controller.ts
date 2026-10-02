import { Request, Response, NextFunction } from 'express';
import { agenteRepository } from '../repositories/index.js';

export class AgenteController {
  static async listar(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const agentes = await agenteRepository.findAll();
      res.json(agentes);
    } catch (err) {
      next(err);
    }
  }

  static async obterPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const agente = await agenteRepository.findById(id);
      if (!agente) {
        res.status(404).json({ erro: 'Agente não encontrado.' });
        return;
      }
      res.json(agente);
    } catch (err) {
      next(err);
    }
  }
}
