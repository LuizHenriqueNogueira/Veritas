import {ResultadoAgente} from '../../models/index.js';
import {ResearchService} from '../research/research.service.js';
import {ResearchResult} from '../research/types.js';
export {searchTerms} from '../research/html.js';
export type FactCheckSearch=ResearchResult;
export class FactCheckService extends ResearchService {}
export function aplicarChecagens(result:ResultadoAgente,search:ResearchResult):ResultadoAgente{
 const r=structuredClone(result),read=search.sources.filter(s=>s.readState==='LIDA').length;
 const messages={DESATIVADA:'Pesquisa desativada.',TERMOS_INSUFICIENTES:'Termos insuficientes para pesquisar.',INDISPONIVEL:'Serviços de pesquisa indisponíveis.',SEM_RESULTADOS:'Nenhum resultado relevante encontrado. Ausência de resultado não comprova veracidade.',PARCIAL:'Pesquisa parcial; consulte o estado de cada página.',ENCONTRADAS:'Pesquisa e leitura concluídas.'};
 r.resultado+=`\n\nPesquisa na internet: ${messages[search.state]} ${search.sources.length} resultado(s) selecionado(s), ${read} página(s) lida(s). Consulta: ${search.query || '(nenhuma)'}. Busca em ${search.searchedAt}. Até cinco páginas, priorizando relevância, checagens e diversidade de domínios; não representa toda a internet.`;
 if(search.sources.length)r.resultado+=' A semelhança de assunto não prova que se trata da mesma notícia. Datas, identidade e trechos citados devem corresponder à afirmação analisada.';
 r.achados.push({categoria:'Pesquisa de fontes',descricao:`${messages[search.state]} ${read}/${search.sources.length} páginas lidas. Serviços consultados: ${search.portals.join(', ') || 'nenhum'}.${search.failedPortals.length?' Falhas: '+search.failedPortals.join(', ')+'.':''}`,nivel_relevancia:'BAIXO'});
 for(const [i,s] of search.sources.entries()) { if(s.readState==='IRRELEVANTE')continue; r.fontes.push({titulo:`[${s.id || 'F'+(i+1)}] ${s.title}`,url:s.url,dominio:new URL(s.url).hostname,
 avaliacao:`${s.publisher}. Tipo: ${s.kind || 'OUTRA'}. Leitura: ${s.readState || 'RESUMO'}. Publicação: ${s.date || 'não informada'}. Consulta: ${s.readAt || search.searchedAt}. ${s.detail || 'Resultado do índice de pesquisa.'} Trecho: ${s.excerpt.slice(0,850)}`}); }
 return r;
}
export const factCheckService=new FactCheckService();
