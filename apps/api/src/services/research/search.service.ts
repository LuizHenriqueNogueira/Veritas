import {load} from 'cheerio';
import {readLimited} from '../network.js';
import {plain,publisher,relevance,safeResultUrl,sourceKind,words,normalize} from './html.js';
import {ResearchSource} from './types.js';
export function parseSearchHtml(html:string):ResearchSource[]{
  const $=load(html),found:ResearchSource[]=[];
  if($('#challenge-form,.anomaly-modal').length || /captcha|verify you are human/i.test($('title').text()))throw new Error('O mecanismo de busca bloqueou a consulta automática.');
  $('.result').each((index,element)=>{
    const box=$(element),anchor=box.find('a.result__a').first();
    const url=safeResultUrl(anchor.attr('href') || '','https://html.duckduckgo.com');
    const title=anchor.text().replace(/\s+/g,' ').trim().slice(0,240);
    if(!url || !title || box.hasClass('result--ad'))return;
    found.push({url,title,publisher:publisher(url),date:'',excerpt:box.find('.result__snippet').text().replace(/\s+/g,' ').trim().slice(0,600),kind:sourceKind(url),readState:'RESUMO',position:index+1});
  });
  if(!found.length && !$('.result,.no-results,.no-results__message').length && !/No results found|Nenhum resultado/i.test($.text()))throw new Error('Formato da busca indisponível.');
  return found.slice(0,10);
}
export interface Discovery{sources:ResearchSource[];portals:string[];failedPortals:string[];}
export class SearchService {
  private g1?:{at:number;sources:ResearchSource[]};
  private blockedUntil=0;
  constructor(private request:typeof fetch=(...args)=>fetch(...args)){}
  private async text(url:string,maxBytes=1000000){
    const response=await this.request(url,{signal:AbortSignal.timeout(9000),redirect:'error',headers:{Accept:'text/html,application/json,application/xml;q=0.9'}});
    if(!response.ok){await response.body?.cancel();throw new Error('Pesquisa indisponível.');}
    return readLimited(response,maxBytes);
  }
  private async web(query:string){
    if(Date.now()<this.blockedUntil)throw new Error('Busca pública em espera após bloqueio.');
    const url=new URL('https://html.duckduckgo.com/html/');url.searchParams.set('q',query);url.searchParams.set('kl','br-pt');
    try{return parseSearchHtml(await this.text(url.href));}catch(error){this.blockedUntil=Date.now()+60000;throw error;}
  }
  private async wordpress(host:string,query:string){
    const url=new URL(`https://${host}/wp-json/wp/v2/posts`);
    url.search=new URLSearchParams({search:query,per_page:'8',_fields:'link,title,date,excerpt',orderby:'relevance'}).toString();
    const data=JSON.parse(await this.text(url.href));if(!Array.isArray(data))throw new Error('Índice do portal inválido.');
    return data.slice(0,8).flatMap((p:any)=>{
      const link=typeof p?.link==='string'?safeResultUrl(p.link):null;
      if(!link || new URL(link).hostname!==host || /\/(english|espanol)\//.test(new URL(link).pathname))return [];
      const title=plain(p.title?.rendered || '',240),excerpt=plain(p.excerpt?.rendered || '',600);
      if(!words(query).some(t=>normalize(title).includes(t)) || relevance(title,excerpt,query)<0.5)return [];
      return [{url:link,title,excerpt,publisher:publisher(link),date:typeof p.date==='string'?p.date.slice(0,10):'',kind:sourceKind(link),readState:'RESUMO' as const}];
    });
  }
  private async g1feed(){
    if(this.g1 && Date.now()-this.g1.at<1800000)return structuredClone(this.g1.sources);
    const xml=await this.text('https://g1.globo.com/rss/g1/fato-ou-fake/',2000000),$=load(xml,{xmlMode:true});
    if(!$('channel').length)throw new Error('Feed Fato ou Fake indisponível.');
    const sources:ResearchSource[]=[];
    $('item').slice(0,300).each((_i,el)=>{
      const item=$(el),url=safeResultUrl(item.find('link').first().text());
      if(!url || new URL(url).hostname!=='g1.globo.com' || !new URL(url).pathname.startsWith('/fato-ou-fake/'))return;
      const date=new Date(item.find('pubDate').text());
      sources.push({url,title:plain(item.find('title').text(),240),excerpt:plain(item.find('description').text() || item.find('atom\\:subtitle').text(),600),date:Number.isFinite(date.getTime())?date.toISOString().slice(0,10):'',publisher:'Fato ou Fake',kind:'CHECAGEM',readState:'RESUMO'});
    });
    this.g1={at:Date.now(),sources};return structuredClone(sources);
  }
  private async aosfatos(query:string){
    const url=new URL('https://www.aosfatos.org/noticias/');url.searchParams.set('q',query);
    const $=load(await this.text(url.href)),sources:ResearchSource[]=[],seen=new Set<string>();
    $('a[href*="/noticias/"][title]').each((_i,el)=>{
      const anchor=$(el),link=safeResultUrl(anchor.attr('href') || '',url.href),title=plain(anchor.attr('title') || anchor.text(),240);
      if(!link || new URL(link).hostname!=='www.aosfatos.org' || seen.has(link) || !title || relevance(title,'',query)<0.5)return;
      seen.add(link);sources.push({url:link,title,excerpt:title,publisher:'Aos Fatos',date:'',kind:'CHECAGEM',readState:'RESUMO'});
    });
    // A página pode retornar zero matérias; isso é diferente de não responder.
    if(!sources.length && !$('form[action="/noticias"]').length && !/Aos Fatos/.test($('title').text()))throw new Error('Índice Aos Fatos indisponível.');
    return sources.slice(0,8);
  }
  async discover(query:string):Promise<Discovery>{
    // Uma consulta ampla e outra dirigida aos dois canais pedidos, mais índices públicos.
    const tasks=[
      {name:'DuckDuckGo',run:()=>this.web(query)},
      {name:'Aos Fatos e Fato ou Fake via busca',run:()=>this.web(`${query} (site:aosfatos.org OR site:g1.globo.com/fato-ou-fake)`)},
      {name:'Boatos.org',run:()=>this.wordpress('www.boatos.org',query)},
      {name:'E-farsas',run:()=>this.wordpress('www.e-farsas.com',query)},
      {name:'Aos Fatos',run:()=>this.aosfatos(query)},
      {name:'Fato ou Fake RSS',run:async()=>(await this.g1feed()).filter(s=>relevance(s.title,s.excerpt,query)>=0.6).slice(0,8)}
    ];
    const settled=await Promise.allSettled(tasks.map(t=>t.run()));
    const sources:ResearchSource[]=[],portals:string[]=[],failedPortals:string[]=[];
    settled.forEach((r,i)=>{if(r.status==='fulfilled'){portals.push(tasks[i].name);sources.push(...r.value);}else failedPortals.push(tasks[i].name);});
    return {sources,portals,failedPortals};
  }
}
