import { describe, it, expect, vi, beforeEach } from 'vitest';
const mocks = vi.hoisted(() => ({ createWorker: vi.fn() }));
vi.mock('tesseract.js', async importOriginal => ({ ...await importOriginal<any>(), createWorker: mocks.createWorker }));
import { ServicoCapturaOCR } from '../../src/services/ocr.service.js';
// A imagem é apenas assinatura PNG para isolar o serviço. O OCR real fica nos testes de integração.
const imagem = 'data:image/png;base64,' + Buffer.from([137,80,78,71,13,10,26,10]).toString('base64');
describe('ServicoCapturaOCR', () => {
  let service: ServicoCapturaOCR;
  const terminate = vi.fn();
  const recognize = vi.fn();
  beforeEach(() => { vi.clearAllMocks(); service = new ServicoCapturaOCR(); mocks.createWorker.mockResolvedValue({ recognize, terminate }); recognize.mockResolvedValue({ data: { text: 'Texto   capturado\n\n\ncom espaçamento.', confidence: 91 } }); terminate.mockResolvedValue(undefined); });
  it('TU07: rejeita região pequena', () => { service.iniciarCaptura(); expect(service.capturarRegiao({x:0,y:0,largura:3,altura:2}).valido).toBe(false); });
  it('TU08: informa entrada vazia e descarte', async () => { const r=await service.reconhecerTexto('   '); expect(r).toMatchObject({sucesso:false,codigo:'SEM_TEXTO',imagemDescartada:true}); });
  it('TU09: encaminha bytes ao motor, normaliza e libera worker', async () => { const r=await service.reconhecerTexto(imagem); expect(Buffer.isBuffer(recognize.mock.calls[0][0])).toBe(true); expect(r.texto).toBe('Texto capturado\n\ncom espaçamento.'); expect(service.retornarTexto()).toBe(r.texto); expect(r.confiancaMedia).toBe(91); expect(terminate).toHaveBeenCalledOnce(); });
  it('TU23: rejeita texto pronto em vez de simular OCR', async () => { expect((await service.reconhecerTexto('Texto já reconhecido')).codigo).toBe('IMAGEM_INVALIDA'); expect(mocks.createWorker).not.toHaveBeenCalled(); });
  it('TU24: distingue falha do motor de imagem sem texto e libera worker', async () => { recognize.mockRejectedValue(new Error('motor falhou')); expect((await service.reconhecerTexto(imagem)).codigo).toBe('MOTOR_INDISPONIVEL'); expect(terminate).toHaveBeenCalledOnce(); });
  it('TU25: informa imagem sem texto após executar motor', async () => { recognize.mockResolvedValue({data:{text:' \n ',confidence:0}}); expect((await service.reconhecerTexto(imagem)).codigo).toBe('SEM_TEXTO'); expect(recognize).toHaveBeenCalledOnce(); });
  it('TU26: rejeita assinatura inválida e URLs remotas', async () => { for (const input of ['https://example.com/a.png','data:image/png;base64,dGV4dG8=']) expect((await service.reconhecerTexto(input)).codigo).toBe('IMAGEM_INVALIDA'); expect(mocks.createWorker).not.toHaveBeenCalled(); });
  it('TU27: rejeita coordenadas não numéricas', () => { service.iniciarCaptura(); expect(service.capturarRegiao({x:0,y:0,largura:NaN,altura:100}).valido).toBe(false); });
  it('TU28: permite nova tentativa após falha do motor', async () => { recognize.mockRejectedValueOnce(new Error('falha')); await service.reconhecerTexto(imagem); expect((await service.reconhecerTexto(imagem)).sucesso).toBe(true); });
});
