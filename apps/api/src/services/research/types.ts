import { TipoAgente } from '../../models/index.js';
export type SourceKind='CHECAGEM'|'IMPRENSA'|'OFICIAL'|'OUTRA';
export interface ResearchSource {
  title:string;url:string;publisher:string;date:string;excerpt:string;
  id?:string;kind?:SourceKind;readState?:'LIDA'|'RESUMO'|'INDISPONIVEL'|'BLOQUEADA'|'IRRELEVANTE';
  text?:string;readAt?:string;detail?:string;position?:number;
  reviewedClaim?:string;reviewRating?:string;
}
export interface ResearchResult {
  state:'ENCONTRADAS'|'SEM_RESULTADOS'|'PARCIAL'|'INDISPONIVEL'|'DESATIVADA'|'TERMOS_INSUFICIENTES';
  query:string;searchedAt:string;portals:string[];failedPortals:string[];sources:ResearchSource[];
  attemptedPages?:number;provider?:string;tipo?:TipoAgente;
}
export interface EvidenceSource {id:string;tipo:SourceKind;origem:string;titulo:string;data:string;trecho:string;alegacao?:string;rotulo?:string;}
export interface EvidenceContext {consulta:string;buscaEm:string;estado:string;leitura:string;fontes:EvidenceSource[];}
export interface EvidenceCitation {id:string;relacao:'CORROBORA'|'CONTRADIZ'|'CONTEXTO';trecho:string;verifica_mesmo_fato:boolean;}
export type FactualVerdict='CORROBORADA'|'CONTRADITA'|'ENGANOSA'|'EVIDENCIA_INSUFICIENTE'|'NAO_SE_APLICA';
