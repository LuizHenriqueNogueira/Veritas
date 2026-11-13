import {TipoAgente} from '../../models/index.js';
import {createHash} from 'node:crypto';
import {ResearchResult,ResearchSource} from './types.js';
import {PORTALS,publisher,relevance,relevantExcerpt,searchTerms,sourceKind,subjectMatches} from './html.js';
import {SearchService} from './search.service.js';
import {PublicWeb} from './public-web.js';
import {extractArticle} from './html.js';
export class ResearchService {
  private cache=new Map<string,{at:number;value:ResearchResult}>();
  private pending=new Map<string,Promise<ResearchResult>>();
  private pages=new Map<string,{at:number;value:Partial<ResearchSource>}>();
  constructor(private search=new SearchService(),private web=new PublicWeb()){}
  status(){return {enabled:process.env.FACTCHECK_ENABLED!=='false',portals:PORTALS,paidSearch:false,cacheMinutes:10,maxPages:5,readsPages:true,searchProvider:'DuckDuckGo HTML e índices públicos',appliesTo:['desinformacao','fraude_digital','link_suspeito']};}
  async consultar(content:string,explicit?:string,tipo:TipoAgente='desinformacao',scope='local',contexto='',paginaOrigem=''):Promise<ResearchResult>{
    let query=searchTerms(content,explicit,tipo);
    if(tipo==='link_suspeito' && (contexto || explicit)){try{const terms=searchTerms(contexto,explicit,'fraude_digital');query=`${new URL(content).hostname} ${terms || 'phishing golpe'}`.slice(0,140);}catch{query='';}}
    const base:ResearchResult={query,searchedAt:new Date().toISOString(),portals:[],failedPortals:[],sources:[],state:'SEM_RESULTADOS',attemptedPages:0,provider:'DuckDuckGo HTML e índices públicos',tipo};
    if(!this.status().enabled)return {...base,state:'DESATIVADA'};
    if(query.length<3)return {...base,state:'TERMOS_INSUFICIENTES'};
    let excluded='';if(tipo==='link_suspeito')try{excluded=new URL(content).hostname.toLowerCase();}catch{}
    const identity=createHash('sha256').update(JSON.stringify([scope,content,contexto,paginaOrigem])).digest('hex');
    const key=JSON.stringify([identity,query,tipo,excluded]),cached=this.cache.get(key);
    if(cached && Date.now()-cached.at<(cached.value.state==='INDISPONIVEL'?60000:600000))return structuredClone(cached.value);
    const waiting=this.pending.get(key);if(waiting)return structuredClone(await waiting);
    const request=this.research(base,excluded,identity,paginaOrigem);this.pending.set(key,request);
    try{const value=await request;this.cache.set(key,{at:Date.now(),value});if(this.cache.size>100)this.cache.delete(this.cache.keys().next().value!);return structuredClone(value);}finally{this.pending.delete(key);}
  }
  private async research(base:ResearchResult,excluded:string,identity:string,paginaOrigem=''):Promise<ResearchResult>{
    const discovery=await this.search.discover(base.query);base.portals=discovery.portals;base.failedPortals=discovery.failedPortals;
    const unique=new Map<string,ResearchSource>();
    for(const s of discovery.sources){
      const u=new URL(s.url),host=u.hostname.toLowerCase();
      if(paginaOrigem){const original=new URL(paginaOrigem);if(u.origin===original.origin && u.pathname.replace(/\/$/,'')===original.pathname.replace(/\/$/,''))continue;}
      if(/\/(noticias-sobre|tag|tags|busca|search|category)\//.test(u.pathname))continue;
      if(excluded && (host===excluded || host.endsWith('.'+excluded)))continue;
      if(relevance(s.title,s.excerpt,base.query)<0.5)continue;
      if(!subjectMatches(s.title,s.excerpt,base.query))continue;
      const key=host.replace(/^www\./,'')+u.pathname.replace(/\/$/,'')+u.search;
      if(!unique.has(key))unique.set(key,{...s,kind:sourceKind(s.url),publisher:publisher(s.url)});
    }
    const rank=(s:ResearchSource)=>({CHECAGEM:30,OFICIAL:25,IMPRENSA:12,OUTRA:0}[s.kind || 'OUTRA'])+relevance(s.title,s.excerpt,base.query)*10-(s.position || 10)*0.03;
    const ranked=[...unique.values()].sort((a,b)=>rank(b)-rank(a));
    const selected:ResearchSource[]=[],hosts=new Set<string>();
    for(const s of ranked){const host=new URL(s.url).hostname.replace(/^www\./,'');if(hosts.has(host))continue;hosts.add(host);selected.push(s);if(selected.length===5)break;}
    // Se houver menos de cinco domínios, admite outro artigo do mesmo portal.
    if(selected.length<5)for(const s of ranked){if(selected.includes(s))continue;selected.push(s);if(selected.length===5)break;}
    base.attemptedPages=selected.length;
    base.sources=await Promise.all(selected.map(async(s,index)=>{
      const cacheKey=JSON.stringify([identity,s.url,excluded,base.query]),cached=this.pages.get(cacheKey);let data:Partial<ResearchSource>;
      if(cached && Date.now()-cached.at<600000)data=cached.value;
      else{
        try{
          const page=await this.web.article(s.url,excluded);
          if(paginaOrigem){const final=new URL(page.url),original=new URL(paginaOrigem);if(final.origin===original.origin && final.pathname.replace(/\/$/,'')===original.pathname.replace(/\/$/,''))throw new Error('A página enviada não é uma confirmação independente.');}
          const a=extractArticle(page.body,page.url,base.query);
          // O domínio final pode ter outra classificação após redirecionar.
          data={url:page.url,title:a.title || s.title,date:a.date || s.date,text:a.text,reviewedClaim:a.reviewedClaim,reviewRating:a.reviewRating,
            kind:sourceKind(page.url),publisher:publisher(page.url),readAt:new Date().toISOString(),
            readState:a.blocked?'BLOQUEADA':a.text.length<160?'RESUMO':a.score<0.35?'IRRELEVANTE':'LIDA',
            detail:a.blocked?'Portal exige verificação de acesso.':a.text.length<160?'Somente resumo disponível.':a.score<0.35?'Página não apresentou correspondência suficiente com a consulta.':'Texto da página obtido; trechos relevantes serão selecionados para a IA.'};
        }catch(error){data={readState:/bloque|permitid|reservad|robots|domínio/i.test((error as Error).message)?'BLOQUEADA':'INDISPONIVEL',detail:(error as Error).message.slice(0,180),readAt:new Date().toISOString()};}
        this.pages.set(cacheKey,{at:Date.now(),value:data});if(this.pages.size>150)this.pages.delete(this.pages.keys().next().value!);
      }
      const source={...s,...structuredClone(data),id:'F'+(index+1)};
      source.excerpt=source.readState==='LIDA'?relevantExcerpt(source,base.query):s.excerpt;
      return source;
    }));
    const failed=base.sources.some(s=>s.readState!=='LIDA');
    base.state=!base.sources.length?(base.portals.length?'SEM_RESULTADOS':'INDISPONIVEL'):base.failedPortals.length || failed?'PARCIAL':'ENCONTRADAS';
    return base;
  }
}
