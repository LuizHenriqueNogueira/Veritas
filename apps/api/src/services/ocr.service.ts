import { createWorker, OEM } from 'tesseract.js';
import { createRequire } from 'node:module';
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export interface CoordenadasRegiao { x: number; y: number; largura: number; altura: number }
export interface ResultadoOCR {
  sucesso: boolean; texto: string; confiancaMedia?: number; mensagem?: string;
  codigo?: 'IMAGEM_INVALIDA' | 'SEM_TEXTO' | 'MOTOR_INDISPONIVEL' | 'OCR_OCUPADO';
  imagemDescartada: boolean;
}

// Só os modelos de idioma vão ao disco. As imagens recebidas ficam na memória.
function prepararIdiomas(): string {
  if (process.env.OCR_LANG_PATH) return path.resolve(process.env.OCR_LANG_PATH);
  const require = createRequire(__filename);
  const destino = path.resolve(process.env.DATA_DIR || 'data', 'tessdata');
  mkdirSync(destino, { recursive: true });
  for (const idioma of ['por', 'eng']) {
    const pacote = require(`@tesseract.js-data/${idioma}`);
    const arquivo = path.join(destino, `${idioma}.traineddata.gz`);
    if (!existsSync(arquivo)) copyFileSync(path.join(pacote.langPath, `${idioma}.traineddata.gz`), arquivo);
  }
  return destino;
}

export class ServicoCapturaOCR {
  private estadoCapturaAtivo = false;
  private ultimoTextoReconhecido = '';
  private ocupado = false;
  iniciarCaptura() {
    this.estadoCapturaAtivo = true;
    return { status: 'CAPTURA_INICIADA', mensagem: 'Selecione uma região ou carregue uma imagem.' };
  }
  capturarRegiao(regiao: CoordenadasRegiao): { valido: boolean; mensagem?: string } {
    if (!this.estadoCapturaAtivo) return { valido: false, mensagem: 'O modo de captura não foi iniciado previamente.' };
    if (![regiao.x, regiao.y, regiao.largura, regiao.altura].every(Number.isFinite)) return { valido: false, mensagem: 'Coordenadas inválidas.' };
    if (regiao.x < 0 || regiao.y < 0 || regiao.largura <= 5 || regiao.altura <= 5) return { valido: false, mensagem: 'Área selecionada muito pequena para leitura textual.' };
    this.estadoCapturaAtivo = false;
    return { valido: true };
  }
  async reconhecerTexto(entrada: unknown): Promise<ResultadoOCR> {
    const falha = (codigo: ResultadoOCR['codigo'], mensagem: string): ResultadoOCR =>
      ({ sucesso: false, texto: '', codigo, mensagem, imagemDescartada: true });
    // Não aceita texto pronto, caminhos locais ou URLs como se fossem imagens.
    if (typeof entrada !== 'string' || !entrada.trim()) return falha('SEM_TEXTO', 'Nenhum texto foi identificado. Selecione uma imagem para reconhecer.');
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(entrada);
    if (!match || match[2].length > 8 * 1024 * 1024) return falha('IMAGEM_INVALIDA', 'Envie uma imagem PNG, JPEG ou WebP de até 6 MB.');
    const imagem = Buffer.from(match[2], 'base64');
    const png = imagem.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpeg = imagem[0] === 255 && imagem[1] === 216 && imagem[2] === 255;
    const webp = imagem.toString('ascii', 0, 4) === 'RIFF' && imagem.toString('ascii', 8, 12) === 'WEBP';
    if (!((match[1] === 'png' && png) || (match[1] === 'jpeg' && jpeg) || (match[1] === 'webp' && webp))) return falha('IMAGEM_INVALIDA', 'O arquivo não contém uma imagem válida no formato informado.');
    if (this.ocupado) return falha('OCR_OCUPADO', 'Há um reconhecimento em andamento. Aguarde e tente novamente.');
    this.ocupado = true;
    this.ultimoTextoReconhecido = '';
    let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let encerrado = false;
    try {
      const langPath = prepararIdiomas();
      let rejeitarErro!: (err: Error) => void;
      const erroWorker = new Promise<never>((_, reject) => { rejeitarErro = reject; });
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Tempo limite do OCR excedido.')), 60000);
      });
      const executar = async () => {
        const w = await createWorker('por+eng', OEM.LSTM_ONLY, {
          langPath, cachePath: langPath, cacheMethod: 'none',
          errorHandler: err => rejeitarErro(new Error(String(err)))
        });
        // Se a inicialização terminar após o timeout, não deixe um worker órfão.
        if (encerrado) { await w.terminate(); throw new Error('OCR encerrado.'); }
        worker = w;
        return w.recognize(imagem);
      };
      const ret = await Promise.race([executar(), erroWorker, timeout]);
      const texto = ret.data.text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
      if (!/[\p{L}\p{N}]/u.test(texto)) return falha('SEM_TEXTO', 'Nenhum texto legível foi identificado. Tente uma imagem mais nítida.');
      this.ultimoTextoReconhecido = texto;
      return { sucesso: true, texto, confiancaMedia: ret.data.confidence, imagemDescartada: true };
    } catch {
      return falha('MOTOR_INDISPONIVEL', 'Não foi possível executar o OCR. Confira a instalação dos pacotes de idioma, o caminho OCR_LANG_PATH e tente novamente.');
    } finally {
      encerrado = true;
      if (timer) clearTimeout(timer);
      await worker?.terminate().catch(() => undefined);
      this.ocupado = false;
    }
  }
  retornarTexto(): string { return this.ultimoTextoReconhecido; }
}
