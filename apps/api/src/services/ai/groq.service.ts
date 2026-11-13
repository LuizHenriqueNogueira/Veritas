import { ResultadoAgente, TipoAgente } from '../../models/index.js';
import { configuracaoIA } from './config.js';
import { instrucaoSistema, schemaAnalise, schemaComPesquisa, validarRespostaIA } from './analysis-contract.js';
import { readLimited } from '../network.js';
import {EvidenceContext,ResearchResult} from '../research/types.js';
import {evidenceContext,validateEvidence} from '../research/evidence.js';
import {budgetLimits} from './usage-budget.js';
import {relevance} from '../research/html.js';
export function groqBody(tipo:TipoAgente,conteudo:string,pesquisa?:EvidenceContext){
  const config=configuracaoIA();
  return {model:config.model,messages:[{role:'system',content:instrucaoSistema(tipo,pesquisa)},{role:'user',content:JSON.stringify({conteudo_para_analise:conteudo,...(pesquisa?{pesquisa}: {})})}],
    max_completion_tokens:config.maxOutputTokens,reasoning_effort:'low',temperature:0,seed:42,stream:false,
    response_format:{type:'json_schema',json_schema:{name:'analise_veritas',strict:true,schema:pesquisa?schemaComPesquisa:schemaAnalise}}};
}
export function reservedTokens(tipo:TipoAgente,conteudo:string,pesquisa?:EvidenceContext){
  // Bytes UTF-8 de todo o payload (inclui schema) + saída máxima + margem de protocolo.
  return Buffer.byteLength(JSON.stringify(groqBody(tipo,conteudo,pesquisa)),'utf8')+configuracaoIA().maxOutputTokens+512;
}
export function boundedEvidence(tipo:TipoAgente,conteudo:string,search:ResearchResult){
  const context=evidenceContext(search),ceiling=budgetLimits().tokensMinute-32;
  // A página é lida localmente; apenas trechos limitados são enviados ao modelo.
  context.fontes=context.fontes.map(s=>({...s,titulo:s.titulo.slice(0,100),trecho:s.trecho.slice(0,750),...(s.alegacao?{alegacao:s.alegacao.slice(0,160)}:{})}));
  // Prioriza fontes identificadas e pertinentes, preservando seus IDs originais.
  const priority=(s:EvidenceContext['fontes'][number])=>({OFICIAL:3,CHECAGEM:3,IMPRENSA:2,OUTRA:0}[s.tipo])+relevance(s.titulo,s.trecho,context.consulta);
  context.fontes.sort((a,b)=>priority(b)-priority(a));
  while(reservedTokens(tipo,conteudo,context)>ceiling){
    const longest=context.fontes.reduce<typeof context.fontes[number]|undefined>((best,s)=>!best || s.trecho.length>best.trecho.length?s:best,undefined);
    // Uma frase cortada em 60 caracteres pode perder justamente a resposta.
    // Prefere menos fontes com trechos úteis a cinco trechos inutilizáveis.
    if(longest && longest.trecho.length>240){longest.trecho=longest.trecho.slice(0,Math.max(240,longest.trecho.length-60));continue;}
    const extra=context.fontes.find(s=>s.alegacao || s.rotulo);if(extra){delete extra.alegacao;delete extra.rotulo;continue;}
    if(context.fontes.length){context.fontes.pop();continue;}
    break; // O orçamento bloqueará um texto que, sozinho, já exceda o teto.
  }
  return context;
}
export interface GroqObserver{response(headers:Headers,status:number):void;usage(total:number):void;}
export class GroqService {
  async analisar(tipo:TipoAgente,conteudo:string,observer?:GroqObserver,pesquisa?:EvidenceContext):Promise<ResultadoAgente> {
    const config=configuracaoIA();
    const key=process.env.GROQ_API_KEY?.trim();
    if(!key)throw new Error('GROQ_API_KEY não configurada. Crie uma chave gratuita na Groq e salve somente no backend/.env.');
    let response:Response;
    try{
      response=await fetch('https://api.groq.com/openai/v1/chat/completions',{
        method:'POST',signal:AbortSignal.timeout(45000),headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
        body:JSON.stringify(groqBody(tipo,conteudo,pesquisa))
      });
    }catch{throw new Error('Não foi possível conectar à Groq dentro do tempo limite. Confira sua conexão.');}
    try{observer?.response(response.headers,response.status);}catch(error){await response.body?.cancel();throw error;}
    if(!response.ok){
      await response.body?.cancel();
      if(response.status===429)throw new Error('Limite de uso da Groq atingido. Aguarde a renovação da quota gratuita. Não houve troca de provedor nem nova tentativa automática.');
      if(response.status===401 || response.status===403)throw new Error('A Groq recusou a chave ou o acesso ao modelo. Confira GROQ_API_KEY e GROQ_MODEL.');
      throw new Error(`A Groq não concluiu a análise (HTTP ${response.status}). Confira o modelo, os limites e tente novamente mais tarde.`);
    }
    try{
      const data=JSON.parse(await readLimited(response,256*1024));
      if(Number.isSafeInteger(data.usage?.total_tokens) && data.usage.total_tokens>=0)observer?.usage(data.usage.total_tokens);
      const choice=data.choices?.[0];
      if(choice?.finish_reason!=='stop' || typeof choice.message?.content!=='string')throw new Error('Resposta incompleta.');
      const value=JSON.parse(choice.message.content),result=validarRespostaIA(value);
      return pesquisa?validateEvidence(result,value,pesquisa,tipo):result;
    }catch{throw new Error('A Groq retornou uma resposta incompleta ou inválida. Nenhum resultado foi tratado como uma análise concluída.');}
  }
}
