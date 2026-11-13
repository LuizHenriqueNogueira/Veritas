import {it,expect,vi} from 'vitest';
import {AnaliseService} from '../../src/services/analise.service.js';
import {MemoryAnaliseRepository,MemoryAgenteRepository,MemoryFonteRepository,MemoryAchadoRepository} from '../../src/repositories/memory.repository.js';
it('pesquisas concorrentes de contas diferentes preservam fontes e histórico do proprietário',async()=>{
  let release!:(v:any)=>void;
  const research=(name:string)=>({state:'ENCONTRADAS',query:name,searchedAt:new Date().toISOString(),portals:['teste'],failedPortals:[],sources:[{id:'F1',title:`Fonte ${name}`,url:`https://${name}.example.test/artigo`,publisher:name,date:'2026-11-06',excerpt:`Evidência exclusiva ${name}`,readState:'LIDA'}]});
  const search={consultar:vi.fn((_c,_t,_a,scope)=>scope==='1'?new Promise(r=>release=r):Promise.resolve(research('lucas')))};
  const ai={analisar:vi.fn().mockImplementation(async()=>({classificacao:'Inconclusivo',resultado:'Teste de isolamento',fontes:[],achados:[]}))};
  const service=new AnaliseService(new MemoryAnaliseRepository(),new MemoryAgenteRepository(),new MemoryFonteRepository(),new MemoryAchadoRepository(),ai,{consultar:vi.fn()},search as any);
  const a=service.criarEExecutarAnalise(1,{tipo_entrada:'TEXTO',agente_tipo:'desinformacao',conteudo:'Pesquisa do Luiz'});
  await vi.waitFor(()=>expect(search.consultar).toHaveBeenCalled());
  const b=await service.criarEExecutarAnalise(2,{tipo_entrada:'TEXTO',agente_tipo:'desinformacao',conteudo:'Pesquisa do Lucas'});
  release(research('luiz'));const first=await a;
  expect(first.fontes.map(f=>f.dominio)).toEqual(['luiz.example.test']);expect(b.fontes.map(f=>f.dominio)).toEqual(['lucas.example.test']);
  expect((await service.obterDetalhesAnalise(b.id,2)).fontes[0].titulo).toContain('lucas');
  await expect(service.obterDetalhesAnalise(first.id,2)).rejects.toThrow('Acesso negado');
  expect((await service.listarAnalisesDoUsuario(2)).map(a=>a.id)).toEqual([b.id]);
});
