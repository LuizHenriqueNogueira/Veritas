import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { AnaliseService } from '../services/analise.service.js';
import {
  analiseRepository,
  agenteRepository,
  fonteRepository,
  achadoRepository
} from '../repositories/index.js';

const analiseService = new AnaliseService(
  analiseRepository,
  agenteRepository,
  fonteRepository,
  achadoRepository
);

export class AnaliseController {
  static async criar(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const usuarioId = req.user!.userId;
      const { tipo_entrada, agente_id, agente_tipo, conteudo, url } = req.body;

      const resultado = await analiseService.criarEExecutarAnalise(usuarioId, {
        tipo_entrada,
        agente_id: agente_id ? Number(agente_id) : undefined,
        agente_tipo,
        conteudo,
        url
      });

      res.status(201).json(resultado);
    } catch (err) {
      next(err);
    }
  }

  static async listar(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const usuarioId = req.user!.userId;
      const { agenteId, busca } = req.query;

      const analises = await analiseService.listarAnalisesDoUsuario(usuarioId, {
        agenteId: agenteId ? Number(agenteId) : undefined,
        busca: busca ? String(busca) : undefined
      });

      res.json(analises);
    } catch (err) {
      next(err);
    }
  }

  static async obterPorId(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const usuarioId = req.user!.userId;
      const analiseId = Number(req.params.id);

      if (isNaN(analiseId)) {
        res.status(400).json({ erro: 'ID da análise deve ser um número válido.' });
        return;
      }

      const analise = await analiseService.obterDetalhesAnalise(analiseId, usuarioId);
      res.json(analise);
    } catch (err) {
      next(err);
    }
  }
}
