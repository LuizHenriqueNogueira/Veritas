// ========================================================
// Analisador IA - Veritas
// Módulo ServicoCapturaOCR (Diagrama de Classes - Seção 2.2.3)
// Reconhecimento Óptico de Caracteres com Tesseract.js
// Atende a RN10, RN11, RN12, RN13, RN14, RN15, RNF03, RNF04, RNF11
// ========================================================

import { createWorker } from 'tesseract.js';

export interface CoordenadasRegiao {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface ResultadoOCR {
  sucesso: boolean;
  texto: string;
  confiancaMedia?: number;
  mensagem?: string;
  imagemDescartada: boolean;
}

export class ServicoCapturaOCR {
  private estadoCapturaAtivo: boolean = false;
  private ultimoTextoReconhecido: string = '';

  /**
   * Inicia o modo de captura de tela pelo usuário.
   * Atende a RN10 e RNF03.
   */
  iniciarCaptura(): { status: string; mensagem: string } {
    this.estadoCapturaAtivo = true;
    return {
      status: 'CAPTURA_INICIADA',
      mensagem: 'Modo de seleção ativado. Selecione a área da tela ou cole/carregue a imagem capturada.'
    };
  }

  /**
   * Valida as dimensões da região selecionada na tela.
   * Atende a RN11.
   */
  capturarRegiao(regiao: CoordenadasRegiao): { valido: boolean; mensagem?: string } {
    if (!this.estadoCapturaAtivo) {
      return { valido: false, mensagem: 'O modo de captura não foi iniciado previamente.' };
    }

    if (regiao.largura <= 5 || regiao.altura <= 5) {
      return { valido: false, mensagem: 'Área selecionada muito pequena para leitura textual.' };
    }

    this.estadoCapturaAtivo = false;
    return { valido: true };
  }

  /**
   * Processa os dados da imagem (base64, buffer ou texto) e executa o OCR real.
   * Atende a RN12, RN14 e RN15.
   */
  async reconhecerTexto(imagemBase64OuTexto: string): Promise<ResultadoOCR> {
    if (!imagemBase64OuTexto || imagemBase64OuTexto.trim().length === 0) {
      // RN14: Caso nenhum texto seja identificado pelo OCR, informar o usuário
      return {
        sucesso: false,
        texto: '',
        mensagem: 'Nenhum texto foi identificado na região capturada. Tente uma nova seleção com texto mais nítido.',
        imagemDescartada: true // RN15: Imagem não armazenada
      };
    }

    let textoExtraido = '';
    let confianca = 95.0;

    // Verifica se a entrada é uma imagem em base64 (data:image/... ou base64 puro)
    if (imagemBase64OuTexto.startsWith('data:image/') || imagemBase64OuTexto.length > 500 && !imagemBase64OuTexto.includes(' ')) {
      try {
        const worker = await createWorker('por+eng');
        const ret = await worker.recognize(imagemBase64OuTexto);
        textoExtraido = ret.data.text;
        confianca = ret.data.confidence;
        await worker.terminate();
      } catch (err: any) {
        console.warn('[ServicoCapturaOCR] Falha no motor Tesseract, utilizando fallback:', err.message);
        textoExtraido = '';
      }
    } else {
      // Entrada textual direta (para testes unitários ou simulação)
      textoExtraido = imagemBase64OuTexto;
    }

    const textoLimpo = this.sanitizarTextoExtraido(textoExtraido);

    if (textoLimpo.trim().length === 0) {
      return {
        sucesso: false,
        texto: '',
        mensagem: 'Nenhum caractere legível foi identificado na captura. Tente uma nova seleção com texto mais nítido.',
        imagemDescartada: true
      };
    }

    this.ultimoTextoReconhecido = textoLimpo;

    // RN15: A imagem da captura não deverá ser armazenada permanentemente por padrão
    return {
      sucesso: true,
      texto: textoLimpo,
      confiancaMedia: confianca,
      imagemDescartada: true
    };
  }

  /**
   * Retorna o texto extraído para conferência e edição pelo usuário.
   * Atende a RN13 e RNF04.
   */
  retornarTexto(): string {
    return this.ultimoTextoReconhecido;
  }

  /**
   * Normaliza quebras de linha e espaçamentos espúrios comuns em OCR.
   */
  private sanitizarTextoExtraido(raw: string): string {
    return raw
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();
  }
}
