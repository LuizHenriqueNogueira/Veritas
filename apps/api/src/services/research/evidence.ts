import {ResearchResult,EvidenceContext,EvidenceCitation,FactualVerdict} from './types.js';
import {ResultadoAgente,TipoAgente} from '../../models/index.js';
export function evidenceContext(research:ResearchResult):EvidenceContext{
  return {consulta:research.query,buscaEm:research.searchedAt,estado:research.state,
    leitura:'Trechos extraídos das páginas lidas. Data vazia significa publicação desconhecida. Resultados não lidos não são evidência.',
    fontes:research.sources.filter(s=>s.readState==='LIDA').slice(0,5).map((s,i)=>({id:s.id || 'F'+(i+1),tipo:s.kind || 'OUTRA',origem:new URL(s.url).hostname.replace(/^www\./,''),titulo:s.title.slice(0,160),data:s.date,trecho:s.excerpt.slice(0,1200),
      ...(s.reviewedClaim?{alegacao:s.reviewedClaim.slice(0,250)}:{}),...(s.reviewRating?{rotulo:s.reviewRating.slice(0,80)}:{})}))};
}
const canon=(s:string)=>s.normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
export function validateEvidence(result:ResultadoAgente,value:any,context:EvidenceContext,tipo:TipoAgente):ResultadoAgente{
  const citations:EvidenceCitation[]=Array.isArray(value?.citacoes)?value.citacoes.slice(0,5).flatMap((c:any)=>{
    const s=context.fontes.find(s=>s.id===c?.id);
    if(!s || typeof c.trecho!=='string' || c.trecho.trim().length<12 || c.trecho.length>250 || !['CORROBORA','CONTRADIZ','CONTEXTO'].includes(c.relacao))return [];
    const exact=[s.trecho,s.alegacao || '',s.rotulo || ''].some(field=>canon(field).includes(canon(c.trecho)));
    return exact?[{id:c.id,relacao:c.relacao,trecho:c.trecho.trim(),verifica_mesmo_fato:c.relacao!=='CONTEXTO'}]:[];
  }):[];
  const names:Record<FactualVerdict,string>={CORROBORADA:'Informação confirmada pelas fontes (baixo risco)',CONTRADITA:'Desinformação identificada pelas fontes (alto risco)',ENGANOSA:'Informação enganosa ou fora de contexto (médio risco)',EVIDENCIA_INSUFICIENTE:'Inconclusivo: evidências insuficientes',NAO_SE_APLICA:result.classificacao};
  let verdict:FactualVerdict=Object.hasOwn(names,value?.veredito)?value.veredito:'EVIDENCIA_INSUFICIENTE';
  if(tipo==='desinformacao'){
    // Os achados factuais vêm de citações verificadas. Afirmações genéricas do
    // modelo sobre "toda a mídia" não viram evidência de uma busca limitada.
    result.achados=[];
    if(verdict==='NAO_SE_APLICA')verdict='EVIDENCIA_INSUFICIENTE';
    const relevant=citations.filter(c=>c.verifica_mesmo_fato && (verdict==='CORROBORADA'?c.relacao==='CORROBORA':verdict==='CONTRADITA'?c.relacao==='CONTRADIZ':true));
    const trusted=relevant.filter(c=>context.fontes.find(s=>s.id===c.id)?.tipo!=='OUTRA');
    const direct=trusted.some(c=>['CHECAGEM','OFICIAL'].includes(context.fontes.find(s=>s.id===c.id)!.tipo));
    const pressIds=new Set(trusted.map(c=>context.fontes.find(s=>s.id===c.id)!.origem));
    if(verdict!=='EVIDENCIA_INSUFICIENTE' && !(direct || pressIds.size>=2)){
      verdict='EVIDENCIA_INSUFICIENTE';
      const reason=relevant.length
        ?'Há citações que se relacionam diretamente com a afirmação, mas elas ainda não atendem aos critérios de confirmação das fontes. Falta uma checagem direta, uma fonte oficial identificada ou apoio de dois veículos de imprensa independentes.'
        :citations.length
          ?'Foram encontrados trechos de contexto, mas nenhuma citação validada sustenta o veredito proposto sobre a mesma afirmação.'
          :'A síntese recebida não apresentou citações literais, pertinentes e suficientes para sustentar um veredito factual.';
      result.resultado=reason+' Confira as fontes e os trechos disponíveis e compare a pessoa, o fato e a data da alegação. O parecer automático não foi tratado como uma confirmação ou refutação.';
    }
    result.classificacao=names[verdict];
    result.resultado=`Veredito factual: ${names[verdict]}.\n\n${result.resultado}`;
    const dated=[...new Set(citations.filter(c=>c.verifica_mesmo_fato).map(c=>context.fontes.find(s=>s.id===c.id)?.data).filter(Boolean))];
    if(dated.length)result.achados.push({categoria:'Data das evidências citadas',descricao:`Publicação: ${dated.join(', ')}. A conclusão expressa o apoio encontrado nessas fontes; a consulta não é uma comprovação em tempo real da situação de uma pessoa.`,nivel_relevancia:'BAIXO'});
  }
  for(const c of citations)result.achados.push({categoria:`Evidência ${c.id} — ${c.relacao.toLowerCase()}`,descricao:`“${c.trecho}”${c.verifica_mesmo_fato?'':' (contexto; não verifica diretamente a mesma afirmação)'}`,nivel_relevancia:c.verifica_mesmo_fato?'ALTO':'BAIXO'});
  return result;
}
