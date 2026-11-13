import {beforeEach,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {AnaliseService} from '../../src/services/analise.service.js';
import {AnalysisJobs} from '../../src/services/analysis-jobs.js';
import {MemoryAnaliseRepository,MemoryAgenteRepository,MemoryFonteRepository,MemoryAchadoRepository} from '../../src/repositories/memory.repository.js';
let repo:MemoryAnaliseRepository,service:AnaliseService;
const researchResult={state:'SEM_RESULTADOS',query:'teste',searchedAt:new Date().toISOString(),portals:[],failedPortals:[],sources:[]};
const research={consultar:vi.fn()},ai={analisar:vi.fn()},reputation={consultar:vi.fn()};
const dto={tipo_entrada:'TEXTO' as const,agente_tipo:'desinformacao',conteudo:'Afirmação para verificar'};
beforeEach(()=>{vi.clearAllMocks();process.env.LINK_USE_AI='true';repo=new MemoryAnaliseRepository();research.consultar.mockResolvedValue(researchResult);ai.analisar.mockResolvedValue(null);reputation.consultar.mockResolvedValue({enabled:false,consultas:[]});service=new AnaliseService(repo,new MemoryAgenteRepository(),new MemoryFonteRepository(),new MemoryAchadoRepository(),ai,reputation,research as any);});
it('AC01: URL, contexto e termos conversam sem enviar contexto à base de reputação',async()=>{
 const original='https://example.com/conta',contexto='Recebi uma cobrança e um pedido urgente de senha.';
 // Resultado da reputação desativada vem da implementação real, sem acessar a rede.
 const {ReputationService}=await import('../../src/services/reputation/reputation.service.js');reputation.consultar.mockImplementation(url=>new ReputationService().consultar(url));
 const result=await service.criarEExecutarAnalise(1,{tipo_entrada:'URL',agente_tipo:'link_suspeito',url:original,contexto,termos_busca:'cobrança suspeita'});
 expect(research.consultar).toHaveBeenCalledWith(original,'cobrança suspeita','link_suspeito','1',contexto);
 expect(JSON.parse(ai.analisar.mock.calls[0][1])).toEqual({url:original,contexto_da_mensagem:contexto});expect(reputation.consultar).toHaveBeenCalledWith(original);expect(result.contexto).toBe(contexto);expect(result.url).toBe(original);
});
it('AC02: valida contexto antes de criar registro ou consultar serviços',async()=>{
 for(const data of [{...dto,contexto:'Mensagem adicional'},{...dto,contexto:123},{...dto,contexto:'x'.repeat(2001)}])await expect(service.criarEExecutarAnalise(1,data as any)).rejects.toThrow('contexto');
 expect(await repo.findByUsuarioId(1)).toEqual([]);expect(ai.analisar).not.toHaveBeenCalled();
});
it('AC03: cancelar durante a pesquisa impede chamada posterior à IA e publicação do resultado',async()=>{
 let finish!:(x:any)=>void;research.consultar.mockReturnValue(new Promise(r=>finish=r));const request=randomUUID();
 const running=service.criarEExecutarAnalise(1,{...dto,solicitacao_id:request});await vi.waitFor(()=>expect(research.consultar).toHaveBeenCalled());
 expect((await service.cancelar(1,request)).status).toBe('CANCELADA');const result=await running;expect(result.status).toBe('CANCELADA');expect(result.fontes).toEqual([]);expect(ai.analisar).not.toHaveBeenCalled();
 finish(researchResult);await Promise.resolve();expect((await repo.findById(result.id))?.status).toBe('CANCELADA');
});
it('AC04: resposta atrasada da IA não reclassifica análise cancelada',async()=>{
 let finish!:(x:any)=>void;ai.analisar.mockReturnValue(new Promise(r=>finish=r));const request=randomUUID();const running=service.criarEExecutarAnalise(1,{...dto,solicitacao_id:request});await vi.waitFor(()=>expect(ai.analisar).toHaveBeenCalled());
 await service.cancelar(1,request);const result=await running;finish({classificacao:'Confirmado',resultado:'Resultado atrasado',fontes:[],achados:[]});await Promise.resolve();expect((await repo.findById(result.id))?.status).toBe('CANCELADA');expect((await repo.findById(result.id))?.resultado).not.toContain('Resultado atrasado');
});
it('AC05: cancelamento de outra conta não afeta a solicitação do proprietário',async()=>{
 let finish!:(x:any)=>void;research.consultar.mockReturnValue(new Promise(r=>finish=r));const request=randomUUID();const running=service.criarEExecutarAnalise(1,{...dto,solicitacao_id:request});await vi.waitFor(()=>expect(research.consultar).toHaveBeenCalled());await service.cancelar(2,request);expect((await repo.findByUsuarioId(1))[0].status).toBe('PROCESSANDO');finish(researchResult);expect((await running).status).toBe('CONCLUIDA');
});
it('AC06: cancelamento recebido antes do POST impede execução e consumo de IA',async()=>{
 const request=randomUUID();await service.cancelar(1,request);await expect(service.criarEExecutarAnalise(1,{...dto,solicitacao_id:request})).rejects.toThrow('cancelada');expect(await repo.findByUsuarioId(1)).toEqual([]);expect(ai.analisar).not.toHaveBeenCalled();
});
it('AC07: cancelar solicitação já concluída informa histórico sem reescrever seu parecer',async()=>{
 const request=randomUUID(),result=await service.criarEExecutarAnalise(1,{...dto,solicitacao_id:request});expect((await service.cancelar(1,request)).status).toBe('CONCLUIDA');expect((await repo.findById(result.id))?.status).toBe('CONCLUIDA');
});
it('AC08: coordenador rejeita identificador inválido e solicitações simultâneas duplicadas',()=>{
 const jobs=new AnalysisJobs(),id=randomUUID();expect(()=>jobs.start(1,'inválido')).toThrow();const a=jobs.start(1,id);expect(()=>jobs.start(1,id)).toThrow('andamento');expect(jobs.cancel(2,id).status).toBe('CANCELADA');expect(a.controller.signal.aborted).toBe(false);jobs.finish(a,'CONCLUIDA');
});
