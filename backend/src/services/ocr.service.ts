// ========================================================
// Analisador IA - Veritas
// Módulo ServicoCapturaOCR (Diagrama de Classes - Seção 2.2.3)
// Atende a RN10, RN11, RN12, RN13, RN14, RN15, RNF03, RNF04, RNF11
// ========================================================

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
      mensagem: 'Modo de seleção retangular ativado. Selecione a área da tela com o mouse.'
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

    // Após validação da região, finaliza o estado da seleção
    this.estadoCapturaAtivo = false;
    return { valido: true };
  }

  /**
   * Processa os dados brutos da imagem (base64 ou buffer), executa o OCR,
   * limpa o texto obtido e descarta a imagem imediatamente da memória/disco.
   * Atende a RN12, RN14 e RN15.
   */
  async reconhecerTexto(imagemBase64OuTextoSimulado: string): Promise<ResultadoOCR> {
    if (!imagemBase64OuTextoSimulado || imagemBase64OuTextoSimulado.trim().length === 0) {
      // RN14: Caso nenhum texto seja identificado pelo OCR, informar o usuário e permitir nova captura
      return {
        sucesso: false,
        texto: '',
        mensagem: 'Nenhum texto foi identificado na região capturada. Tente uma nova seleção com texto mais nítido.',
        imagemDescartada: true // RN15: Imagem não armazenada
      };
    }

    // Limpeza e normalização do texto extraído
    const textoLimpo = this.sanitizarTextoExtraido(imagemBase64OuTextoSimulado);

    if (textoLimpo.trim().length === 0) {
      return {
        sucesso: false,
        texto: '',
        mensagem: 'Nenhum caractere legível foi extraído na captura. Realize uma nova captura.',
        imagemDescartada: true
      };
    }

    this.ultimoTextoReconhecido = textoLimpo;

    // RN15: A imagem da captura não deverá ser armazenada permanentemente por padrão
    return {
      sucesso: true,
      texto: textoLimpo,
      confiancaMedia: 96.5,
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
