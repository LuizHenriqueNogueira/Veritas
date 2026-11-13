import {it,expect,vi} from 'vitest';
import {ResearchService} from '../../src/services/research/research.service.js';
it('RC01: pesquisa com contexto/termos continua ancorada ao domínio e não visita o alvo suspeito',async()=>{
 process.env.FACTCHECK_ENABLED='true';const search={discover:vi.fn().mockResolvedValue({sources:[],portals:['índice de teste'],failedPortals:[]})},web={article:vi.fn()};const service=new ResearchService(search as any,web as any);
 const result=await service.consultar('https://example.com/cobranca','pedido de senha','link_suspeito','1','Recebi uma cobrança urgente.');expect(result.query).toContain('example.com');expect(result.query).toContain('pedido');expect(result.query).toContain('senha');expect(search.discover).toHaveBeenCalledWith(result.query);expect(web.article).not.toHaveBeenCalled();
});
it('RC02: contexto e conta diferentes não reutilizam resultados de outra consulta',async()=>{
 process.env.FACTCHECK_ENABLED='true';const search={discover:vi.fn().mockResolvedValue({sources:[],portals:['teste'],failedPortals:[]})},service=new ResearchService(search as any,{} as any);
 await service.consultar('https://example.com',undefined,'link_suspeito','1','Cobrança de senha');await service.consultar('https://example.com',undefined,'link_suspeito','1','Prêmio por Pix');await service.consultar('https://example.com',undefined,'link_suspeito','2','Prêmio por Pix');expect(search.discover).toHaveBeenCalledTimes(3);
});
