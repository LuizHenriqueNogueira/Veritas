import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ResultadoAgente } from '../../models/index.js';
import { readLimited } from '../network.js';
import {UrlFeed,PHISHING_DATABASE_INFO} from './url-feed.js';

export const OPENPHISH_FEED='https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt';
const OPENPHISH_INFO='https://www.openphish.com/phishing_feeds.html';
const GOOGLE_INFO='https://developers.google.com/safe-browsing';
const TTL=12*60*60*1000;
export type EstadoFonte='LISTADO'|'NAO_LISTADO'|'INDISPONIVEL'|'DESATUALIZADO'|'DESATIVADO'|'NAO_CONFIGURADO';
export interface ConsultaFonte {
  fonte:string;estado:EstadoFonte;consultadoEm:string;atualizadoEm?:string;desatualizado?:boolean;detalhe:string;
}
export interface ConsultaReputacao {fontes:ConsultaFonte[];listado:boolean;limitada:boolean}
interface Snapshot {version:1;fetchedAt:number;hashes:string[]}
export function normalizarUrl(value:string):string {
  const u=new URL(value);
  if(!['http:','https:'].includes(u.protocol))throw new Error('URL HTTP/HTTPS exigida.');
  u.hash=''; // Fragmentos não são enviados ao servidor; preserve esquema, caminho e query.
  return u.href;
}
function digest(value:string):string{return createHash('sha256').update(normalizarUrl(value)).digest('hex');}
export class ReputationService {
  private extra:UrlFeed;
  private snapshot:Snapshot|null=null;private hashes=new Set<string>();private loaded=false;
  private pending:Promise<boolean>|null=null;private retryAfter=0;private lastError='';
  private googlePositive=new Map<string,{expires:number;detail:string}>();
  constructor(private request:typeof fetch=(...args)=>fetch(...args),
    private cacheFile=path.resolve(process.env.DATA_DIR || 'data','reputation','openphish.json'),
    private now:()=>number=()=>Date.now()){this.extra=new UrlFeed(request,path.join(path.dirname(cacheFile),'phishing-database.json'),now);}
  private enabled(){return process.env.REPUTATION_ENABLED!=='false';}
  private load(){
    if(this.loaded)return;this.loaded=true;
    try{
      if(fs.statSync(this.cacheFile).size>6*1024*1024)return;
      const s=JSON.parse(fs.readFileSync(this.cacheFile,'utf8')) as Snapshot;
      if(s.version!==1 || !Number.isFinite(s.fetchedAt) || s.fetchedAt<=0 || s.fetchedAt>this.now()+300000 || !Array.isArray(s.hashes) || !s.hashes.length || s.hashes.length>30000 || s.hashes.some(h=>typeof h!=='string' || !/^[a-f0-9]{64}$/.test(h)))return;
      this.snapshot=s;this.hashes=new Set(s.hashes);
    }catch{/* Sem cache, a primeira análise tenta consultar a fonte. */}
  }
  status(){
    this.load();return {enabled:this.enabled(),openphish:{loaded:Boolean(this.snapshot),entries:this.hashes.size,
      updatedAt:this.snapshot?new Date(this.snapshot.fetchedAt).toISOString():null,
      stale:this.snapshot?this.now()-this.snapshot.fetchedAt>=TTL:false,refreshHours:12,lastError:this.lastError || null},
      phishingDatabase:{enabled:process.env.PHISHING_DATABASE_ENABLED!=='false',...this.extra.status()},
      googleSafeBrowsingConfigured:Boolean(process.env.SAFE_BROWSING_API_KEY?.trim())};
  }
  async atualizar():Promise<boolean>{
    if(!this.enabled())return false;
    const [open,extra]=await Promise.all([this.atualizarOpenphish(),process.env.PHISHING_DATABASE_ENABLED!=='false'?this.extra.refresh():Promise.resolve(false)]);
    return open || extra;
  }
  private async atualizarOpenphish():Promise<boolean>{
    this.load();
    if(this.snapshot && this.now()-this.snapshot.fetchedAt<TTL)return true;
    if(this.pending)return this.pending;
    if(this.now()<this.retryAfter)return false;
    this.pending=this.download();
    try{return await this.pending;}finally{this.pending=null;}
  }
  private async download():Promise<boolean>{
    try{
      // Somente o feed fixo é baixado; nunca abre a URL suspeita do usuário.
      const response=await this.request(OPENPHISH_FEED,{signal:AbortSignal.timeout(12000),redirect:'error',headers:{Accept:'text/plain'}});
      if(!response.ok){await response.body?.cancel();throw new Error('Fonte indisponível.');}
      const body=await readLimited(response,5*1024*1024);
      const hashes=new Set<string>();
      for(const raw of body.split(/\r?\n/)){
        const value=raw.trim();if(!value || value.startsWith('#'))continue;
        try{hashes.add(digest(value));}catch{throw new Error('Formato inesperado do feed.');}
        if(hashes.size>30000)throw new Error('Feed excede o tamanho esperado.');
      }
      if(!hashes.size)throw new Error('Feed vazio.');
      const snapshot:Snapshot={version:1,fetchedAt:this.now(),hashes:[...hashes]};
      this.snapshot=snapshot;this.hashes=hashes;this.lastError='';this.retryAfter=0;
      try{fs.mkdirSync(path.dirname(this.cacheFile),{recursive:true});const temp=this.cacheFile+'.tmp';fs.writeFileSync(temp,JSON.stringify(snapshot));fs.renameSync(temp,this.cacheFile);}catch{this.lastError='Base atualizada em memória; não foi possível salvar o cache em disco.';}
      return true;
    }catch{this.retryAfter=this.now()+60000;this.lastError='OpenPhish indisponível. Nova tentativa permitida após um minuto.';return false;}
  }
  private async google(url:string,consultadoEm:string):Promise<ConsultaFonte>{
    const key=process.env.SAFE_BROWSING_API_KEY?.trim();
    const base={fonte:'Google Safe Browsing',consultadoEm};
    if(!key)return {...base,estado:'NAO_CONFIGURADO',detalhe:'Consulta opcional não executada: SAFE_BROWSING_API_KEY não configurada.'};
    const cached=this.googlePositive.get(url);
    if(cached && cached.expires>this.now())return {...base,estado:'LISTADO',detalhe:cached.detail+' Resultado positivo em cache dentro do prazo fornecido pela Google.'};
    try{
      const response=await this.request('https://safebrowsing.googleapis.com/v4/threatMatches:find?key='+encodeURIComponent(key),{
        method:'POST',signal:AbortSignal.timeout(10000),redirect:'error',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({client:{clientId:'veritas-academic',clientVersion:'1.1.0'},threatInfo:{
          threatTypes:['MALWARE','SOCIAL_ENGINEERING','UNWANTED_SOFTWARE','POTENTIALLY_HARMFUL_APPLICATION'],platformTypes:['ANY_PLATFORM'],threatEntryTypes:['URL'],threatEntries:[{url}]
        }})});
      if(!response.ok){await response.body?.cancel();throw new Error('Fonte indisponível.');}
      const data=JSON.parse(await readLimited(response,256*1024));
      if(!data || typeof data!=='object' || Array.isArray(data) || Object.keys(data).some(k=>k!=='matches') || (data.matches!==undefined && !Array.isArray(data.matches)))throw new Error('Resposta inválida.');
      const matches=data.matches || [];
      const threats=['MALWARE','SOCIAL_ENGINEERING','UNWANTED_SOFTWARE','POTENTIALLY_HARMFUL_APPLICATION'];
      if(matches.some((m:any)=>!m || !threats.includes(m.threatType) || m.threatEntryType!=='URL' || typeof m.threat?.url!=='string' || normalizarUrl(m.threat.url)!==url))throw new Error('Resposta inválida.');
      if(matches.length){
        const labels:Record<string,string>={MALWARE:'malware',SOCIAL_ENGINEERING:'engenharia social/phishing',UNWANTED_SOFTWARE:'software indesejado',POTENTIALLY_HARMFUL_APPLICATION:'aplicação potencialmente nociva'};
        const detail='A Google retornou um registro associado à URL: '+[...new Set(matches.map((m:any)=>labels[m.threatType]))].join(', ')+'. Pode ser um falso positivo; consulte a avaliação da fonte.';
        const durations=matches.map((m:any)=>/^\d+(\.\d+)?s$/.test(m.cacheDuration || '')?Number(m.cacheDuration.slice(0,-1))*1000:0);
        const duration=Math.min(...durations,24*60*60*1000);
        if(duration>0){this.googlePositive.set(url,{expires:this.now()+duration,detail});if(this.googlePositive.size>200)this.googlePositive.delete(this.googlePositive.keys().next().value!);}
        return {...base,estado:'LISTADO',detalhe:detail};
      }
      return {...base,estado:'NAO_LISTADO',detalhe:'Nenhuma correspondência retornada para esta consulta. Isso não significa que a URL seja segura.'};
    }catch{return {...base,estado:'INDISPONIVEL',detalhe:'Não foi possível consultar Google Safe Browsing. Confira conexão, chave, ativação da API e quota.'};}
  }
  async consultar(value:string):Promise<ConsultaReputacao>{
    const url=normalizarUrl(value);const consultadoEm=new Date(this.now()).toISOString();
    if(!this.enabled())return {fontes:[{fonte:'OpenPhish Community',estado:'DESATIVADO',consultadoEm,detalhe:'Consulta de reputação desativada na configuração.'}],listado:false,limitada:true};
    const [,extra,google]=await Promise.all([this.atualizarOpenphish(),this.extra.consult(url,consultadoEm),this.google(url,consultadoEm)]);
    const s=this.snapshot;
    const stale=s?this.now()-s.fetchedAt>=TTL:false;
    const found=this.hashes.has(digest(url));
    const openphish:ConsultaFonte={fonte:'OpenPhish Community',estado:found?'LISTADO':s?(stale?'DESATUALIZADO':'NAO_LISTADO'):'INDISPONIVEL',consultadoEm,
      ...(s?{atualizadoEm:new Date(s.fetchedAt).toISOString(),desatualizado:stale}:{}),
      detalhe:found?'A URL exata consta na cópia consultada da lista de phishing. O registro é um indício de risco e pode exigir revisão.':s?(stale?'Não foi possível atualizar a base. A cópia antiga não permite afirmar ausência de registros atuais.':'A URL exata não consta na cópia consultada. O feed comunitário é limitado; ausência não comprova segurança.'):'Sem uma cópia válida da base. A reputação não pôde ser verificada.'};
    const fontes=[openphish,google,...(process.env.PHISHING_DATABASE_ENABLED==='false'?[]:[extra])];
    return {fontes,listado:fontes.some(f=>f.estado==='LISTADO'),limitada:fontes.some(f=>['INDISPONIVEL','DESATUALIZADO'].includes(f.estado))};
  }
}
export const reputationService=new ReputationService();

// Resultados são persistidos como achados/fontes já existentes no modelo do projeto.
export function aplicarReputacao(resultado:ResultadoAgente,consulta:ConsultaReputacao):ResultadoAgente{
  const r=structuredClone(resultado);
  for(const f of consulta.fontes){
    const registro=f.atualizadoEm?` Cópia da base: ${f.atualizadoEm}${f.desatualizado?' (desatualizada)':''}.`:'';
    r.achados.push({categoria:`Reputação: ${f.fonte} - ${f.estado}`,descricao:`${f.detalhe}${registro} Consulta: ${f.consultadoEm}.`,nivel_relevancia:f.estado==='LISTADO'?'ALTO':f.estado==='NAO_LISTADO'?'BAIXO':'MEDIO'});
    const info=f.fonte==='OpenPhish Community'?OPENPHISH_INFO:f.fonte==='Phishing.Database'?PHISHING_DATABASE_INFO:GOOGLE_INFO;
    if(!['NAO_CONFIGURADO','DESATIVADO','INDISPONIVEL'].includes(f.estado))r.fontes.push({titulo:f.fonte,url:info,dominio:new URL(info).hostname,avaliacao:`${f.estado}. ${f.detalhe}${registro} Consulta: ${f.consultadoEm}.`});
  }
  if(consulta.listado){r.classificacao='Alto risco aparente: URL com registro em base de reputação';r.resultado='Foi encontrada correspondência em uma base consultada. Este indício prevalece sobre uma avaliação de baixo risco da linguagem ou estrutura. Pode haver falso positivo; confira a fonte e a data.\n\n'+r.resultado;}
  else if(consulta.limitada && !/alto|médio|medio|moderado/i.test(r.classificacao)){
    const available=consulta.fontes.some(f=>f.estado==='NAO_LISTADO');
    r.classificacao=available?'Sem registro nas fontes disponíveis: consulta parcial':'Inconclusivo: consulta de reputação indisponível';
    r.resultado='A consulta de reputação está incompleta ou desatualizada. Não há confirmação de segurança.\n\n'+r.resultado;
  }
  else {
    if(!/alto|médio|medio|moderado|inconclusiv/i.test(r.classificacao))r.classificacao='Nenhum sinal de link suspeito identificado (baixo risco aparente)';
    r.resultado='A consulta às bases não retornou correspondência nas fontes disponíveis. Isso não comprova segurança nem descarta histórico em outras bases.\n\n'+r.resultado;
  }
  return r;
}
