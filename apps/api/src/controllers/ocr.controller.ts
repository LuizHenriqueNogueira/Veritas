import { Request, Response, NextFunction } from 'express';
import { ServicoCapturaOCR } from '../services/ocr.service.js';

const servicoOCR = new ServicoCapturaOCR();

export class OCRController {
  static async iniciarCaptura(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = servicoOCR.iniciarCaptura();
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  }

  static async capturarRegiao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { x, y, largura, altura } = req.body;
      const captura = new ServicoCapturaOCR();
      captura.iniciarCaptura();
      const resultado = captura.capturarRegiao({ x, y, largura, altura });
      if (!resultado.valido) {
        res.status(400).json(resultado);
        return;
      }
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  }

  static async reconhecerTexto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { imagem_ou_texto } = req.body;
      const resultado = await servicoOCR.reconhecerTexto(imagem_ou_texto);

      if (!resultado.sucesso) {
        res.status(resultado.codigo === 'MOTOR_INDISPONIVEL' ? 503 : resultado.codigo === 'OCR_OCUPADO' ? 429 : 422).json(resultado);
        return;
      }

      res.json(resultado);
    } catch (err) {
      next(err);
    }
  }
}
