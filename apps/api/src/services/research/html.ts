import {load} from 'cheerio';
import {ResearchSource,SourceKind} from './types.js';
export const PORTALS=['Boatos.org','E-farsas','Aos Fatos','Fato ou Fake','AFP Checamos','Projeto Comprova','Lupa'];
export const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const STOP=new Set('noticia noticias mensagem mensagens recebida recebido verificacao verifique verificar verdade verdadeiro falsa falso boato boatos compartilhe urgente agora sobre para como pelo pela pelos pelas uma umas uns que com sem isso esse essa este esta sao foi ser tem ter nao não voce voces segundo confira saiba afirma afirmacao dizendo disse diz internet texto conteudo cantor reportagem video foto ainda esta está'.split(' '));
export function words(s:string){return normalize(s).match(/[a-z0-9]{3,}/g)||[];}
export function searchTerms(content:string,explicit?:string,tipo='desinformacao'){
  if(!explicit && tipo==='link_suspeito'){
    try{const u=new URL(content);return `${u.hostname} phishing golpe`.slice(0,140);}catch{return '';}
  }
  const text=(explicit?.trim() || content).replace(/\b(?:gsk_|sk-|AIza)[A-Za-z0-9_-]{12,}\b|https?:\/\/\S+|\S+@\S+|\b(?:\d[\s.()-]*){7,}\b/g,' ');
  if(!explicit && /\b(morreu|faleceu|morto|morta)\b/i.test(normalize(text))){
    const predicate=normalize(text).search(/\b(morreu|faleceu|morto|morta)\b/);
    const names=[...text.matchAll(/\b([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]{2,}(?:\s+(?:(?:da|de|do|dos|das)\s+)?[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]{2,}){1,3})/g)]
      .filter(m=>!['bom dia','boa tarde','boa noite','mensagem urgente'].includes(normalize(m[1])))
      .sort((a,b)=>Math.abs((a.index || 0)-predicate)-Math.abs((b.index || 0)-predicate));
    if(names.length){const year=text.match(/\b(?:19|20)\d{2}\b/)?.[0];return `${normalize(names[0][1])} morreu${year?' '+year:''}`.slice(0,140);}
  }
  return [...new Set(words(text).filter(w=>!STOP.has(w) && !/^\d{5,}$/.test(w)))].slice(0,explicit?9:7).join(' ').slice(0,140);
}
export function sourceKind(value:string):SourceKind{
  const u=new URL(value),host=u.hostname.replace(/^www\./,'');
  // Identidade verificada pelo Manual de Padrões do Pix (bcb.gov.br).
  // Não estende a confiança a todo o GitHub, forks, issues ou comentários.
  if(host==='github.com' && /^\/bacen(?:\/pix-api(?:\/blob\/(?:master|main)\/readme\.md)?)?\/?$/i.test(u.pathname))return 'OFICIAL';
  if(['boatos.org','e-farsas.com','aosfatos.org','checamos.afp.com','projetocomprova.com.br','agencialupa.com.br','lupa.uol.com.br'].includes(host) || host==='g1.globo.com' && u.pathname.startsWith('/fato-ou-fake/'))return 'CHECAGEM';
  if(host.endsWith('.gov.br') || ['cert.br','bcb.gov.br','febraban.org.br','robertocarlos.com'].includes(host))return 'OFICIAL';
  if(['g1.globo.com','agenciabrasil.ebc.com.br','bbc.com','reuters.com','apnews.com','cnn.com.br','cnnbrasil.com.br','uol.com.br','folha.uol.com.br','estadao.com.br','veja.abril.com.br'].includes(host))return 'IMPRENSA';
  return 'OUTRA';
}
export function publisher(value:string){
  const u=new URL(value),host=u.hostname.replace(/^www\./,'');
  if(host==='github.com' && sourceKind(value)==='OFICIAL')return 'Banco Central do Brasil — GitHub oficial';
  const names:Record<string,string>={'boatos.org':'Boatos.org','e-farsas.com':'E-farsas','aosfatos.org':'Aos Fatos','checamos.afp.com':'AFP Checamos','projetocomprova.com.br':'Projeto Comprova','agencialupa.com.br':'Lupa','lupa.uol.com.br':'Lupa','g1.globo.com':u.pathname.startsWith('/fato-ou-fake/')?'Fato ou Fake':'g1'};
  return names[host] || host;
}
export function plain(value:string,max=2000){return load(`<div>${value.slice(0,200000)}</div>`)('div').first().text().replace(/\s+/g,' ').trim().slice(0,max);}
export function safeResultUrl(value:string,base?:string):string|null{
  try{const u=new URL(value,base);if(u.hostname==='duckduckgo.com' || u.hostname==='html.duckduckgo.com'){
    const target=u.searchParams.get('uddg');if(!target)return null;return safeResultUrl(target);
  }
  if(u.protocol!=='https:' || u.username || u.password || u.port && u.port!=='443' || u.hostname.length>253)return null;
  u.hash='';for(const key of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(key))u.searchParams.delete(key);
  return u.href;}catch{return null;}
}
export function relevance(title:string,text:string,query:string){
  const terms=words(query).filter(w=>!['phishing','golpe'].includes(w)),hay=normalize(title+' '+text);
  return terms.length?terms.filter(t=>hay.includes(t)).length/terms.length:0;
}
export function subjectMatches(title:string,text:string,query:string){
  if(!/\b(morreu|faleceu|morto|morta)\b/.test(normalize(query))){
    // Palavras genéricas de contexto não substituem o assunto da consulta.
    // Ex.: banco/central/brasil em uma notícia não a tornam uma fonte sobre Pix.
    const generic=new Set('brasil brasileiro brasileira banco central sistema instituicao instituicoes criado criada criados criadas criou criar criador criadora criacao publicado publicada origem'.split(' '));
    const anchors=words(query).filter(w=>!STOP.has(w) && !generic.has(w));
    const hay=normalize(title+' '+text);
    return !anchors.length || anchors.some(w=>new RegExp(`\\b${w}\\b`).test(hay));
  }
  const anchors=words(query).filter(w=>!['morreu','faleceu','morto','morta','morte','falecimento','hoje','ontem','cantor','ator','jogador'].includes(w) && !/^\d+$/.test(w));
  if(anchors.length<2)return true;
  // Uma notícia sobre Antônio Carlos não se torna evidência sobre Roberto Carlos.
  const pattern=anchors.slice(0,2).map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s+(?:\\w+\\s+){0,2}');
  return new RegExp(pattern).test(normalize(title+' '+text.slice(0,1800)));
}
function dateValue(value:unknown){
  if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}/.test(value) || !Number.isFinite(Date.parse(value)))return '';
  return value.slice(0,10);
}
export function extractArticle(html:string,url:string,query:string){
  const $=load(html),objects:any[]=[];
  const visit=(v:any,depth=0)=>{if(!v || depth>8 || objects.length>500)return;if(Array.isArray(v)){for(const x of v.slice(0,100))visit(x,depth+1);return;}if(typeof v==='object'){objects.push(v);if(v['@graph'])visit(v['@graph'],depth+1);if(v.mainEntity)visit(v.mainEntity,depth+1);}};
  $('script[type="application/ld+json"]').each((_i,el)=>{try{const text=$(el).text();if(text.length<250000)visit(JSON.parse(text));}catch{/* JSON-LD inválido não vira evidência. */}});
  const article=objects.find(x=>String(x['@type']).match(/NewsArticle|ReportageNewsArticle|Article|BlogPosting/));
  const review=objects.find(x=>String(x['@type']).includes('ClaimReview'));
  const title=String(article?.headline || $('meta[property="og:title"]').attr('content') || $('h1').first().text() || $('title').text()).replace(/\s+/g,' ').trim().slice(0,240);
  const date=dateValue(article?.datePublished || review?.datePublished || $('meta[property="article:published_time"]').attr('content') || $('time[datetime]').first().attr('datetime'));
  const reviewedClaim=typeof review?.claimReviewed==='string'?plain(review.claimReviewed,600):'';
  const reviewRating=typeof review?.reviewRating?.alternateName==='string'?plain(review.reviewRating.alternateName,100):'';
  $('script,style,noscript,nav,footer,header,aside,form,button,iframe,.related-posts,.sharedaddy,.social-share,[aria-hidden="true"]').remove();
  let text=typeof article?.articleBody==='string'?plain(article.articleBody,35000):'';
  if(text.length<180){
    const selectors=['[itemprop="articleBody"]','.mc-article-body','.entry-content','.content-text','.article-body','.article__body','article','main','body'];
    for(const selector of selectors){
      const container=$(selector).first();if(!container.length)continue;
      const paragraphs=container.find('p,h2,h3,li').map((_i,e)=>$(e).text().replace(/\s+/g,' ').trim()).get().filter(t=>t.length>35);
      const candidate=paragraphs.join('\n');if(candidate.length>text.length)text=candidate.slice(0,35000);
      if(text.length>=250)break;
    }
  }
  const challenge=/verify you are human|checking your browser|just a moment|captcha|access denied/i.test($('title').text()) && text.length<800;
  const score=subjectMatches(title,text,query)?relevance(title,text.slice(0,16000),query):0;
  return {title,date,text,reviewedClaim,reviewRating,score,blocked:challenge};
}
export function relevantExcerpt(source:ResearchSource,query:string,max=1300){
  const terms=words(query),text=source.text || source.excerpt;
  const sentences=[...new Set(text.split(/(?<=[.!?])\s+|\n+/).map(s=>s.trim()).filter(s=>s.length>25 && s.length<1800))];
  const ranked=sentences.map((s,i)=>({s,i,score:terms.reduce((n,t)=>n+(normalize(s).includes(t)?1:0),0)
    +(subjectMatches('',s,query) && /não (?:\w+ ){0,2}morreu|nao (?:\w+ ){0,2}morreu|é falso|e falso|e fake|está vivo|esta vivo|é golpe|e golpe|não há|nao ha/i.test(s)?6:0)
    +(/fraude|golpe|desment/i.test(s)?1:0)-(/^\s*(boato|rumor|bulo)\s*[-–:]/i.test(s)?5:0)-(/\?$/.test(s.trim())?2:0)})).sort((a,b)=>b.score-a.score || a.i-b.i);
  const pertinent=ranked.filter(x=>x.score>0 && subjectMatches('',x.s,query));
  const chosen=(pertinent.length?pertinent:ranked).slice(0,3).map(x=>x.s).join(' ');
  return (chosen || text).replace(/\s+/g,' ').trim().slice(0,max);
}
