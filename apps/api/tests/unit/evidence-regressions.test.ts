import {afterEach,it,expect,vi} from 'vitest';
import {sourceKind,subjectMatches,relevantExcerpt} from '../../src/services/research/html.js';
import {evidenceContext,validateEvidence} from '../../src/services/research/evidence.js';
import {boundedEvidence,GroqService,reservedTokens} from '../../src/services/ai/groq.service.js';
import {ResearchResult} from '../../src/services/research/types.js';

// Trechos públicos presentes na pesquisa que originou a regressão de 13/11/2026.
// Rede/IA simuladas: estes testes não consomem a cota nem dependem do provedor.
const claim='O Pix foi criado pelo Banco Central do Brasil.';
const literal='Pix, criado pelo Banco Central do Brasil.';
const sources=[
 {id:'F1',url:'https://g1.globo.com/fato-ou-fake/noticia/2022/08/03/e-fake-que-bolsonaro-foi-criador-do-pix.ghtml',title:'É #FAKE que Bolsonaro foi criador do PIX | G1',date:'2022-08-03',excerpt:'Saiba como identificar se um conteúdo é falso Saiba como identificar se um conteúdo é falso O Sindicato Nacional dos Funcionários do Banco Central (Sinal) afirma que o sistema de pagamento instantâneo foi criado e implementado pelos analistas e técnicos, servidores concursados do Banco Central do Brasil.'},
 {id:'F2',url:'https://www.aosfatos.org/noticias/bolsonaro-criou-pix-saiba-origem-sistema-pagamentos/',title:'Quem criou o Pix e qual a origem do sistema de pagamentos',date:'',excerpt:'A primeira ocasião em que o BC (Banco Central) fez menção a características do Pix foi no Relatório de Vigilância do SPB (Sistema de Pagamentos Brasileiro) de 2013, publicado no ano seguinte. No fim daquele ano, o Banco Central iniciou o desenvolvimento da infraestrutura tecnológica do ecossistema de pagamentos que viria a ser o Pix.'},
 {id:'F5',url:'https://github.com/bacen',title:'Banco Central do Brasil',date:'',excerpt:('API Pix: a API do Arranjo de Pagamentos Instantâneos Brasileiro, '+literal+' ').repeat(3)}
];
function research():ResearchResult{return {state:'PARCIAL',query:'pix criado banco central brasil',searchedAt:'2026-11-13T16:43:08Z',portals:['busca'],failedPortals:[],sources:sources.map(s=>({...s,publisher:'Fonte pública',readState:'LIDA',kind:sourceKind(s.url)}))};}
const result=()=>({classificacao:'Baixo risco aparente',resultado:'O trecho citado apoia a afirmação.',achados:[],fontes:[]});
const answer=()=>({...result(),veredito:'CORROBORADA',citacoes:[{id:'F5',relacao:'CORROBORA',trecho:literal}]});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});

it('ER01: identifica a publicação do Banco Central sem confiar no restante do GitHub',()=>{
 for(const url of ['https://github.com/bacen','https://github.com/bacen/','https://github.com/bacen/pix-api','https://github.com/bacen/pix-api/blob/master/readme.md'])expect(sourceKind(url)).toBe('OFICIAL');
 for(const url of ['https://github.com/bacen-falso','https://github.com/terceiro/pix-api','https://github.com/bacen/pix-api/issues/1','https://github.com/bacen/pix-api/pull/1','https://github.com/bacen/outro-repositorio','https://github.com.evil.test/bacen'])expect(sourceKind(url)).toBe('OUTRA');
});
it('ER02: coincidência em banco/central/brasil não substitui o assunto Pix',()=>{
 expect(subjectMatches('Corrida bancária no Brasil','Não há quebra generalizada dos bancos. Todas essas mensagens não apresentam comunicados oficiais do Banco Central.','pix criado banco central brasil')).toBe(false);
 expect(subjectMatches(sources[0].title,sources[0].excerpt,'pix criado banco central brasil')).toBe(true);
 expect(subjectMatches(sources[1].title,sources[1].excerpt,'pix criado banco central brasil')).toBe(true);
});
it('ER03: recorte prioriza a resposta e não chamadas de navegação repetidas',()=>{
 const direct='O sistema Pix foi criado e implementado pelos analistas e técnicos do Banco Central do Brasil.';
 const excerpt=relevantExcerpt({...sources[0],publisher:'g1',text:'Saiba como identificar se um conteúdo é falso\nSaiba como identificar se um conteúdo é falso\n'+direct},'pix criado banco central brasil',240);
 expect(excerpt).toBe(direct);
});
it('ER04: orçamento preserva a citação direta e respeita o teto sem chamar a IA',()=>{
 vi.stubEnv('AI_PROVIDER','groq');const r=research();
 r.sources.unshift(...Array.from({length:2},(_,i)=>({...r.sources[0],id:'EX'+i,url:`https://outra${i}.test/a`,kind:'OUTRA' as const,title:'Título '.repeat(40),excerpt:'Texto de contexto bancário sem comprovação da mesma afirmação. '.repeat(40)})));
 const c=boundedEvidence('desinformacao',claim,r);
 expect(reservedTokens('desinformacao',claim,c)).toBeLessThanOrEqual(7200);
 expect(c.fontes.find(s=>s.id==='F5')?.trecho).toContain(literal);
 expect(c.fontes.length).toBeGreaterThan(0);
 expect(c.fontes.every(s=>s.trecho.length>=240)).toBe(true);
});
it('ER05: a resposta simulada com a citação real passa pela mesma validação da Groq',async()=>{
 vi.stubEnv('AI_PROVIDER','groq');vi.stubEnv('GROQ_API_KEY','chave-sintetica-de-teste');
 const network=vi.fn().mockResolvedValue(new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(answer())}}]})));
 vi.stubGlobal('fetch',network);
 const c=boundedEvidence('desinformacao',claim,research());
 const r=await new GroqService().analisar('desinformacao',claim,undefined,c);
 expect(r.classificacao).toContain('Informação confirmada pelas fontes');
 expect(r.resultado).not.toContain('não apresentou citações');
 expect(network).toHaveBeenCalledOnce();
});
it('ER06: uma citação real de fonte desconhecida explica a insuficiência sem negar sua existência',()=>{
 const c=evidenceContext(research());c.fontes.find(s=>s.id==='F5')!.tipo='OUTRA';
 const r=validateEvidence(result(),answer(),c,'desinformacao');
 expect(r.classificacao).toContain('Inconclusivo');
 expect(r.resultado).toContain('Há citações');
 expect(r.resultado).not.toContain('não apresentou citações');
});
it('ER07: reconhecer a fonte oficial não permite aceitar uma citação inventada',()=>{
 const a=answer();a.citacoes[0].trecho='Uma frase inventada que a página oficial não contém.';
 expect(validateEvidence(result(),a,evidenceContext(research()),'desinformacao').classificacao).toContain('Inconclusivo');
});
it('ER08: a identificação da fonte não força confirmação quando a IA não estabeleceu a relação',()=>{
 const a=answer();a.veredito='EVIDENCIA_INSUFICIENTE';
 expect(validateEvidence(result(),a,evidenceContext(research()),'desinformacao').classificacao).toContain('Inconclusivo');
});
