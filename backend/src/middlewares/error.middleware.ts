import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Veritas Error Handler]:', err.message || err);

  const statusCode = err.statusCode || (err.message && err.message.includes('não encontrada') ? 404 : 400);

  res.status(statusCode).json({
    sucesso: false,
    erro: err.message || 'Ocorreu um erro interno no processamento da solicitação.'
  });
}
