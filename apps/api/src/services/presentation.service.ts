import {AnaliseCompletaDTO} from '../models/index.js';
import {vereditoPublico,traducaoLegada} from './verdict.service.js';
export interface AchadoExibido {titulo:string;texto:string;tipo:'alerta'|'evidencia'|'contexto'|'limitacao'|'informacao';nivel_alerta?:'ALTO'|'MEDIO';rotulo:string}
export function mensagemLimiteIA(causa:string){
 if(/reduza o texto|excedem o orçamento por minuto/i.test(causa))return 'O texto ultrapassa o limite permitido para uma análise. Reduza o conteúdo e tente novamente.';
 if(/24 horas|limite diário/i.test(causa))return 'A análise com IA atingiu a proteção das últimas 24 horas. Aguarde a renovação desse período; repetir agora não libera a consulta.';
 if(/por minuto|60 segundos/i.test(causa))return 'O limite temporário da IA foi reservado. Aguarde 60 segundos antes de tentar novamente.';
 if(/alguns segundos/i.test(causa))return 'Aguarde alguns segundos entre as análises e tente novamente.';
 if(/quota|cota|429|rate.limit/i.test(causa))return 'O serviço de IA atingiu um limite temporário. Aguarde a renovação da cota antes de tentar novamente. O administrador pode conferir a disponibilidade em seu painel.';
 if(/não configurad|API_KEY|provedor|AI_PROVIDER|modelo.*bloquead/i.test(causa))return 'A análise com IA precisa ser configurada pelo administrador. Entre em contato com o responsável pelo Veritas.';
 if(/relógio|data antes/i.test(causa))return 'Confira a data e a hora do computador antes de tentar novamente.';
 if(/timeout|tempo.*esgot|fetch|conexão|network|ENOTFOUND|ECONN/i.test(causa))return 'Não foi possível se conectar ao serviço de IA no tempo esperado. Confira sua conexão e tente novamente.';
 return 'O serviço de IA não conseguiu concluir esta tentativa. As referências disponíveis podem ser consultadas abaixo; tente novamente mais tarde.';
}
export function resumoPublico(text:string){
 return text.split(/\n\s*\n/).filter(p=>!/^Motor:|^Pesquisa na internet:/i.test(p.trim())).join('\n\n').trim();
}
export function apresentarAnalise(analise:AnaliseCompletaDTO){
 const inconclusivo=/inconclusiv|sem registro|falha|não foi possível verificar/i.test(analise.classificacao || '');
 const factual=analise.agente?.tipo==='desinformacao';
 const achados:AchadoExibido[]=(analise.achados || []).flatMap<AchadoExibido>(a=>{
  const titulo=a.categoria || 'Observação';
  const texto=/IA complementar indisponível|Síntese de IA não executada/i.test(titulo)?mensagemLimiteIA(a.descricao):a.descricao;
  // Dados de execução pertencem ao painel administrativo, sem interferir no risco.
  if(/^(Contexto enviado à IA|Pesquisa de fontes)$/i.test(titulo))return [];
  if(/^Evidência F\d+/.test(titulo)){
   const contexto=/contexto/i.test(titulo);
   return [{titulo:titulo.replace(/ — .*/,''),texto,tipo:contexto?'contexto':'evidencia',rotulo:contexto?'Contexto':/contradiz/i.test(titulo)?'Contradiz a afirmação':'Apoia a afirmação'}];
  }
  if(/^Reputação:/.test(titulo)){
   const fonte=titulo.replace(/^Reputação:\s*/,'').replace(/ - [A-Z_]+$/,'');
   const listado=/ - LISTADO$/.test(titulo);
   const detalhe=texto.replace(/\s*Cópia da base:[\s\S]*$/,'').replace(/\s*Consulta: [\s\S]*$/,'');
   const alerta=listado && !inconclusivo && !factual;
   return [{titulo:listado?`Registro de risco: ${fonte}`:`Consulta de reputação: ${fonte}`,texto:detalhe,tipo:alerta?'alerta':listado?'informacao':/INDISPONIVEL|DESATUALIZADO|NAO_CONFIGURADO|DESATIVADO/.test(titulo)?'limitacao':'informacao',...(alerta?{nivel_alerta:'ALTO' as const}:{}),rotulo:alerta?'Alerta importante':'Consulta'}];
  }
  if(/indispon[ií]vel|não executada|Data das evidências|DESATUALIZADO|NAO_CONFIGURADO|DESATIVADO/i.test(titulo))return [{titulo,texto,tipo:'limitacao',rotulo:'Limitação'}];
  if(!factual && !inconclusivo && ['ALTO','MEDIO'].includes(a.nivel_relevancia))return [{titulo,texto,tipo:'alerta',nivel_alerta:a.nivel_relevancia as 'ALTO'|'MEDIO',rotulo:a.nivel_relevancia==='ALTO'?'Alerta importante':'Atenção'}];
  return [{titulo,texto,tipo:'informacao',rotulo:'Observação'}];
 });
 const referencias=(analise.fontes || []).map(f=>{
  const avaliacao=f.avaliacao || '';
  const estado=avaliacao.match(/Leitura: ([A-Z_]+)/)?.[1];
  const data=avaliacao.match(/Publicação: ([^.]+)/)?.[1];
  return {titulo:f.titulo || f.dominio || 'Referência',url:f.url,origem:f.dominio || new URL(f.url).hostname,
   estado:({LIDA:'Página lida',RESUMO:'Somente resumo',IRRELEVANTE:'Outro assunto',BLOQUEADA:'Leitura bloqueada',INDISPONIVEL:'Não foi possível ler'} as Record<string,string>)[estado || ''] || (/consulta manual|não consultada automaticamente/i.test(avaliacao)?'Consulta manual sugerida':'Referência adicional'),
   publicacao:data && data!=='não informada'?data:null,trecho:avaliacao.match(/Trecho: ([\s\S]*)/)?.[1] || ''};
 });
 const resultado=traducaoLegada(resumoPublico(analise.resultado || '')).replace(/IA indisponível: ([^\n]*)/g,(_match,causa)=>mensagemLimiteIA(causa));
 return {...analise,classificacao:traducaoLegada(analise.classificacao || ''),resultado,apresentacao:{veredito:vereditoPublico(analise),achados,referencias}};
}
