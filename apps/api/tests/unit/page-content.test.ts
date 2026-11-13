import {it,expect,vi} from 'vitest';
import {PageContentService} from '../../src/services/page-content.service.js';
import {boundedEvidence,reservedTokens} from '../../src/services/ai/groq.service.js';
const html='<h1>Produtores e crédito rural</h1><nav><p>Texto do menu que não pertence ao artigo e não deve ser analisado.</p></nav><article>'+Array.from({length:25},(_,i)=>`<p>Parágrafo ${i}: produtores explicam as dívidas e os custos da safra, com informações sobre crédito e renegociação.</p>`).join('')+'</article>';
it('PG01: lê HTML público e limita o recorte com indicação explícita, sem menus',async()=>{
 const web={article:vi.fn().mockResolvedValue({url:'https://noticias.example/artigo',body:html})};
 const page=await new PageContentService(web).ler('https://noticias.example/artigo');
 expect(page.content).toContain('Produtores e crédito rural');expect(page.content).not.toContain('Texto do menu');expect(page.partial).toBe(true);expect(Buffer.byteLength(page.content)).toBeLessThanOrEqual(1600);
 const context=boundedEvidence('desinformacao',page.content,{state:'ENCONTRADAS',query:'produtores credito rural',searchedAt:'2026-11-13',portals:[],failedPortals:[],sources:[{id:'F1',url:'https://fonte.example/credito',title:'Crédito rural',publisher:'Fonte',date:'2026-11-13',excerpt:'Os dados de crédito rural mostram aumento da inadimplência e renegociação das dívidas.',readState:'LIDA',kind:'OFICIAL'}]});
 expect(reservedTokens('desinformacao',page.content,context)).toBeLessThanOrEqual(7200);
 expect(context.fontes).toHaveLength(1);
});
it('PG02: rede privada e protocolos incompatíveis não chegam ao leitor',async()=>{
 const web={article:vi.fn()};const reader=new PageContentService(web);
 for(const url of ['https://127.0.0.1/','https://[::1]/','file:///segredo','http://example.com/','https://user:pass@example.com/'])await expect(reader.ler(url)).rejects.toThrow();
 expect(web.article).not.toHaveBeenCalled();
});
it('PG03: página vazia ou desafio de acesso não viram conteúdo de análise',async()=>{
 for(const body of ['<h1>Entrar</h1>','<title>Verify you are human</title><article><p>'+('Confirme seu acesso para continuar. '.repeat(7))+'</p></article>']){
  const reader=new PageContentService({article:vi.fn().mockResolvedValue({url:'https://example.com/',body})});await expect(reader.ler('https://example.com/')).rejects.toThrow('texto suficiente');
 }
});
