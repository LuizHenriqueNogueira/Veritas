import { describe, it, expect, vi } from 'vitest';
import { AuthController } from '../../src/controllers/auth.controller.js';
import { AgenteController } from '../../src/controllers/agente.controller.js';
import { OCRController } from '../../src/controllers/ocr.controller.js';

describe('Controllers - Testes de Unidade (TU19 - TU22)', () => {
  // TU19: AuthController.register - fluxo de criação de conta
  it('TU19: AuthController.register deve responder status 201 ao cadastrar usuário com sucesso', async () => {
    const req: any = {
      body: {
        nome: 'Usuario Teste',
        email: `teste-${Date.now()}@exemplo.com`,
        senha: 'SenhaSegura123!'
      }
    };
    const res: any = {
      statusCode: 200,
      jsonData: null,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.jsonData = data;
        return this;
      }
    };
    const next = vi.fn();

    await AuthController.register(req, res, next);

    expect(res.statusCode).toBe(201);
    expect(res.jsonData).toHaveProperty('token');
    expect(res.jsonData.usuario).toHaveProperty('id');
    expect(next).not.toHaveBeenCalled();
  });

  // TU20: AgenteController.listar - listagem de agentes ativos
  it('TU20: AgenteController.listar deve responder com array de agentes disponíveis no sistema', async () => {
    const req: any = {};
    const res: any = {
      jsonData: null,
      json(data: any) {
        this.jsonData = data;
        return this;
      }
    };
    const next = vi.fn();

    await AgenteController.listar(req, res, next);

    expect(Array.isArray(res.jsonData)).toBe(true);
    expect(res.jsonData.length).toBeGreaterThanOrEqual(3);
    const tipos = res.jsonData.map((a: any) => a.tipo);
    expect(tipos).toContain('desinformacao');
    expect(tipos).toContain('fraude_digital');
    expect(tipos).toContain('link_suspeito');
  });

  // TU21: OCRController.iniciarCaptura - acionamento do modo de captura
  it('TU21: OCRController.iniciarCaptura deve retornar status CAPTURA_INICIADA', async () => {
    const req: any = {};
    const res: any = {
      jsonData: null,
      json(data: any) {
        this.jsonData = data;
        return this;
      }
    };
    const next = vi.fn();

    await OCRController.iniciarCaptura(req, res, next);

    expect(res.jsonData).toHaveProperty('status', 'CAPTURA_INICIADA');
  });

  // TU22: OCRController.reconhecerTexto - tratamento de entrada vazia
  it('TU22: OCRController.reconhecerTexto deve retornar status 422 para imagem sem texto legível (RN14)', async () => {
    const req: any = { body: { imagem_ou_texto: '   ' } };
    const res: any = {
      statusCode: 200,
      jsonData: null,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.jsonData = data;
        return this;
      }
    };
    const next = vi.fn();

    await OCRController.reconhecerTexto(req, res, next);

    expect(res.statusCode).toBe(422);
    expect(res.jsonData.sucesso).toBe(false);
    expect(res.jsonData.imagemDescartada).toBe(true);
  });
});
