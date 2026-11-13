import type {AnaliseCompletaDTO} from '../models/index.js';
export interface VereditoPublico {titulo:string;descricao:string;tom:'alto'|'medio'|'baixo'|'inconclusivo'}
export function vereditoPublico(a:AnaliseCompletaDTO):VereditoPublico{
  const c=a.classificacao || '',tipo=a.agente?.tipo;
  if(a.status==='CANCELADA' || /cancelad/i.test(c))return {titulo:'Análise cancelada',descricao:'A análise foi interrompida no Veritas. Você pode iniciar outra pesquisa.',tom:'inconclusivo'};
  if(/inconclusiv|não foi possível verificar|insuficien|sem registro|falha/i.test(c))return {
    titulo:/consulta parcial/i.test(c)?'Verificação de links parcial':tipo==='desinformacao'?'Ainda não foi possível verificar':'Análise com limitações',
    descricao:/consulta parcial/i.test(c)?'Nenhum registro foi encontrado nas fontes disponíveis, mas parte da consulta não pôde ser concluída.':'As evidências disponíveis não permitem concluir. Confira as limitações e as fontes.',tom:'inconclusivo'};
  if(tipo==='desinformacao'){
    if(/contradita|desinformação identificada/i.test(c))return {titulo:'Desinformação identificada',descricao:'As fontes consultadas contradizem a afirmação analisada. Confira os trechos e as datas.',tom:'alto'};
    if(/corroborada|informação confirmada/i.test(c))return {titulo:'Informação confirmada pelas fontes',descricao:'A afirmação é apoiada pelas evidências consultadas, no contexto e nas datas indicados.',tom:'baixo'};
    if(/enganosa|fora de contexto/i.test(c))return {titulo:'Informação enganosa ou fora de contexto',descricao:'As evidências indicam distorção ou falta de contexto na afirmação.',tom:'medio'};
    return {titulo:'Ainda não foi possível verificar',descricao:'Uma triagem de linguagem, sozinha, não confirma se uma informação é verdadeira.',tom:'inconclusivo'};
  }
  const high=/alto/i.test(c),medium=/médio|medio|moderado/i.test(c),low=/baixo/i.test(c);
  if(high)return {titulo:tipo==='link_suspeito'?'Link suspeito identificado':'Sinais fortes de fraude identificados',descricao:tipo==='link_suspeito'?'Há sinais de risco na URL ou um registro em base de reputação. Evite acessar e fornecer dados.':'A mensagem contém sinais importantes de golpe. Confira os pedidos e as justificativas.',tom:'alto'};
  if(medium)return {titulo:tipo==='link_suspeito'?'Link com sinais de atenção':'Mensagem com sinais de atenção',descricao:'Confira os indícios apresentados antes de acessar, pagar ou fornecer dados.',tom:'medio'};
  const unavailable=a.achados?.some(x=>/IA complementar indisponível|Síntese de IA não executada/i.test(x.categoria || ''));
  if(low && (!unavailable || tipo==='link_suspeito'))return {titulo:tipo==='link_suspeito'?'Nenhum sinal de link suspeito identificado':'Nenhum sinal de fraude identificado',descricao:tipo==='link_suspeito'?'Não foram identificados sinais relevantes na URL nem registros nas bases disponíveis. Isso não garante que o site seja seguro.':'A análise não identificou sinais relevantes de fraude neste conteúdo. Isso não comprova a identidade do remetente.',tom:'baixo'};
  return {titulo:'Análise com limitações',descricao:'Não foi possível concluir todas as verificações. Confira as observações antes de decidir.',tom:'inconclusivo'};
}
export function traducaoLegada(text:string){return text.replaceAll('Corroborada pelas fontes (baixo risco)','Informação confirmada pelas fontes (baixo risco)').replaceAll('Contradita pelas fontes (alto risco)','Desinformação identificada pelas fontes (alto risco)');}
