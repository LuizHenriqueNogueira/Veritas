import { GoogleGenAI } from '@google/genai';
import { ResultadoAgente, TipoAgente } from '../../models/index.js';
import { instrucaoSistema, schemaAnalise, validarRespostaIA } from './analysis-contract.js';
import { configuracaoIA } from './config.js';
export { validarRespostaIA } from './analysis-contract.js';
export { configuracaoIA } from './config.js';
export class GeminiService {
  isConfigured():boolean {return configuracaoIA().provider==='gemini' && configuracaoIA().configured;}
  async analisarComIA(tipo:TipoAgente,conteudo:string):Promise<ResultadoAgente|null> {
    const config=configuracaoIA();
    if(config.provider==='local')return null;
    if(config.provider!=='gemini')throw new Error('O adaptador Gemini exige AI_PROVIDER=gemini.');
    if(!config.configured)throw new Error('GEMINI_API_KEY não configurada no backend/.env.');
    const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY!.trim(),httpOptions:{timeout:45000}});
    try{
      const r=await ai.models.generateContent({model:config.model!,contents:[{role:'user',parts:[{text:JSON.stringify({conteudo_para_analise:conteudo})}]}],config:{systemInstruction:instrucaoSistema(tipo),temperature:0.1,maxOutputTokens:config.maxOutputTokens,responseMimeType:'application/json',responseJsonSchema:schemaAnalise}});
      return validarRespostaIA(JSON.parse(r.text || 'null'));
    }catch{throw new Error('A análise com Gemini não foi concluída. Confira chave, modelo, conexão e quota. Nenhum provedor alternativo foi acionado.');}
  }
}
