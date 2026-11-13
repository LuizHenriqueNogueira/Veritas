import {it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {AnaliseService} from '../../src/services/analise.service.js';
import {ResearchService} from '../../src/services/research/research.service.js';
import {MemoryAnaliseRepository,MemoryAgenteRepository,MemoryFonteRepository,MemoryAchadoRepository} from '../../src/repositories/memory.repository.js';
const page={url:'https://example.com/noticia',title:'Notícia de teste',content:'Notícia de teste. A reportagem informa que o crédito rural mudou neste período.',partial:false,originalLength:90};
function fixture(){
 const repo=new MemoryAnaliseRepository();
 const ai={analisar:vi.fn().mockImplementation(async()=>({classificacao:'Inconclusivo',resultado:'Comparação de teste.',achados:[],fontes:[]}))};
 const rep={consultar:vi.fn().mockResolvedValue({listado:false,limitada:false,fontes:[]})};
 const research={consultar:vi.fn().mockResolvedValue({state:'SEM_RESULTADOS',query:'credito rural',searchedAt:'2026-11-13',portals:[],failedPortals:[],sources:[]})};
 const reader={ler:vi.fn().mockResolvedValue(page)};
 const service=new AnaliseService(repo,new MemoryAgenteRepository(),new MemoryFonteRepository(),new MemoryAchadoRepository(),ai,rep,research as any,reader);
 return {repo,ai,rep,research,reader,service};
}
it.each(['desinformacao','fraude_digital'] as const)('PA01: %s analisa o texto lido e conserva URL e conteúdo no histórico',async tipo=>{
 const f=fixture();const result=await f.service.criarEExecutarAnalise(42,{tipo_entrada:'URL',agente_tipo:tipo,url:page.url});
 expect(f.ai.analisar).toHaveBeenCalledWith(tipo,page.content,expect.any(Object),'42');
 expect(f.research.consultar).toHaveBeenCalledWith(page.content,undefined,tipo,'42','',page.url);
 const saved=await f.service.obterDetalhesAnalise(result.id,42);expect(saved.url).toBe(page.url);expect(saved.conteudo).toBe(page.content);expect(saved.tipo_entrada).toBe('URL');
 expect((saved as any).apresentacao.achados.find((a:any)=>a.titulo==='Leitura da página enviada').tipo).toBe('informacao');expect(f.rep.consultar).not.toHaveBeenCalled();
});
it('PA02: leitura bloqueada não chama IA e permite tentar texto, sem salvar uma falsa conclusão',async()=>{
 const f=fixture();f.reader.ler.mockRejectedValue(new Error('robots bloqueou'));
 await expect(f.service.criarEExecutarAnalise(42,{tipo_entrada:'URL',agente_tipo:'fraude_digital',url:page.url})).rejects.toThrow('Nenhuma análise de IA');
 expect(f.ai.analisar).not.toHaveBeenCalled();expect(f.research.consultar).not.toHaveBeenCalled();expect(await f.repo.findByUsuarioId(42)).toEqual([]);
});
it('PA03: Link Suspeito continua sem abrir o alvo',async()=>{
 const f=fixture();await f.service.criarEExecutarAnalise(42,{tipo_entrada:'URL',agente_tipo:'link_suspeito',url:page.url});expect(f.reader.ler).not.toHaveBeenCalled();expect(f.rep.consultar).toHaveBeenCalledWith(page.url);
});
it('PA04: cancelar durante a leitura impede pesquisa e chamada de IA',async()=>{
 const f=fixture(),id=randomUUID();let resolve!:(value:any)=>void;
 f.reader.ler.mockImplementation(()=>new Promise(r=>{resolve=r;}));
 const promise=f.service.criarEExecutarAnalise(42,{tipo_entrada:'URL',agente_tipo:'desinformacao',url:page.url,solicitacao_id:id});
 const rejection=expect(promise).rejects.toThrow('cancelada');await vi.waitFor(()=>expect(f.reader.ler).toHaveBeenCalled());await f.service.cancelar(42,id);resolve(page);await rejection;expect(f.ai.analisar).not.toHaveBeenCalled();
});
it('PA05: a página enviada e sua variante com rastreamento não corroboram a si próprias',async()=>{
 process.env.FACTCHECK_ENABLED='true';
 try{
  const search={discover:vi.fn().mockResolvedValue({portals:['teste'],failedPortals:[],sources:[{url:page.url+'?utm_source=teste',title:'credito rural',excerpt:'credito rural',publisher:'Teste',date:''}]})};
  const web={article:vi.fn()};
  const result=await new ResearchService(search as any,web as any).consultar(page.content,undefined,'desinformacao','42','',page.url);
  expect(result.sources).toEqual([]);expect(web.article).not.toHaveBeenCalled();
 }finally{process.env.FACTCHECK_ENABLED='false';}
});
