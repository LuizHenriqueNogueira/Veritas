import { describe, it, expect, beforeEach } from 'vitest';
import { ServicoCapturaOCR } from '../../src/services/ocr.service.js';

describe('ServicoCapturaOCR - Testes de Unidade (TU07 - TU09)', () => {
  let ocrService: ServicoCapturaOCR;

  beforeEach(() => {
    ocrService = new ServicoCapturaOCR();
  });

  // TU07: Validação da área de seleção da tela
  it('TU07: Deve rejeitar regiões de captura com dimensões insuficientes (RN11)', () => {
    ocrService.iniciarCaptura();
    const resultadoInvalido = ocrService.capturarRegiao({ x: 10, y: 10, largura: 3, altura: 2 });

    expect(resultadoInvalido.valido).toBe(false);
    expect(resultadoInvalido.mensagem).toContain('muito pequena');
  });

  // TU08: Ausência de texto legível na imagem e garantia de descarte
  it('TU08: Deve alertar quando nenhum texto for identificado e garantir descarte da imagem (RN14, RN15)', async () => {
    ocrService.iniciarCaptura();
    ocrService.capturarRegiao({ x: 50, y: 50, largura: 200, altura: 100 });

    const resultado = await ocrService.reconhecerTexto('   \n   ');

    expect(resultado.sucesso).toBe(false);
    expect(resultado.mensagem).toContain('Nenhum texto');
    expect(resultado.imagemDescartada).toBe(true); // RN15: Imagem não armazenada
  });

  // TU09: Reconhecimento e sanitização de texto capturado
  it('TU09: Deve limpar quebras espúrias, normalizar texto e disponibilizá-lo para revisão (RN12, RN13, RN15)', async () => {
    ocrService.iniciarCaptura();
    ocrService.capturarRegiao({ x: 50, y: 50, largura: 300, altura: 200 });

    const textoBruto = 'Texto   capturado   da tela\n\n\ncom   espaçamento irregular.';
    const resultado = await ocrService.reconhecerTexto(textoBruto);

    expect(resultado.sucesso).toBe(true);
    expect(resultado.texto).toBe('Texto capturado da tela\n\ncom espaçamento irregular.');
    expect(resultado.imagemDescartada).toBe(true);

    // RN13: Texto deve estar disponível para conferência do usuário
    expect(ocrService.retornarTexto()).toBe(resultado.texto);
  });
});
