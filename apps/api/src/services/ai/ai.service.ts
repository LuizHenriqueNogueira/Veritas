import { createHash } from 'node:crypto';
import { ResultadoAgente, TipoAgente } from '../../models/index.js';
import { configuracaoIA } from './config.js';
import { GeminiService } from './gemini.service.js';
import { GroqService, reservedTokens, boundedEvidence } from './groq.service.js';
import { UsageBudget } from './usage-budget.js';
import {ResearchResult} from '../research/types.js';
export { configuracaoIA } from './config.js';
export class AIService {
  private cache=new Map<string,{at:number;result:ResultadoAgente}>();
  private pending=new Map<string,Promise<ResultadoAgente>>();
  private hits=0;
  constructor(private groq=new GroqService(),private gemini=new GeminiService(),private budget=new UsageBudget()){}
  status(){
    try{return {...this.budget.status(),cacheHits:this.hits,available:true};}
    catch{return {requestsToday:0,tokensToday:0,cacheHits:this.hits,persistent:true,available:false,error:'Controle de consumo indisponível. Chamadas de IA bloqueadas.',accountPlanVerified:false};}
  }
  async analisar(tipo:TipoAgente,conteudo:string,pesquisa?:ResearchResult,scope='local'):Promise<ResultadoAgente|null>{
    const c=configuracaoIA();if(c.provider==='local')return null;
    if(!['groq','gemini'].includes(c.provider))throw new Error('AI_PROVIDER inválido. Use local, groq ou gemini.');
    if(!c.configured)throw new Error(`${c.provider==='groq'?'GROQ_API_KEY':'GEMINI_API_KEY'} não configurada no backend/.env.`);
    if(c.provider!=='groq' || !['openai/gpt-oss-120b','openai/gpt-oss-20b'].includes(c.model || ''))throw new Error('Proteção gratuita: somente Groq GPT-OSS 120B/20B ou modo local. Outros provedores/modelos estão bloqueados nesta distribuição.');
    const context=pesquisa?boundedEvidence(tipo,conteudo,pesquisa):undefined;
    const key=createHash('sha256').update(JSON.stringify(['v6',scope,c.provider,c.model,c.maxOutputTokens,tipo,conteudo,context])).digest('hex');
    const cached=this.cache.get(key);
    if(cached && Date.now()-cached.at<15*60*1000){this.hits++;return structuredClone(cached.result);}
    const pending=this.pending.get(key);if(pending){this.hits++;return structuredClone(await pending);}
    let reservation:number;
    try{reservation=this.budget.reserve(reservedTokens(tipo,conteudo,context));}
    catch(error){throw new Error(`Proteção de consumo: ${(error as Error).message}`);}
    const request=this.groq.analisar(tipo,conteudo,{response:(headers,status)=>this.budget.observe(headers,status),usage:total=>this.budget.settle(reservation,total)},context);
    this.pending.set(key,request);
    try{const result=await request;
      if(context)result.achados.push({categoria:'Contexto enviado à IA',descricao:`${context.fontes.length} trecho(s) de páginas lidas: ${context.fontes.map(s=>s.id).join(', ') || 'nenhum'}. Seleção limitada ao orçamento de tokens; o modelo não recebe o artigo completo.`,nivel_relevancia:'BAIXO'});
      this.cache.set(key,{at:Date.now(),result:structuredClone(result)});if(this.cache.size>100)this.cache.delete(this.cache.keys().next().value!);return structuredClone(result);}
    finally{this.pending.delete(key);}
  }
}
export const aiService=new AIService();
