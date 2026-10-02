// ========================================================
// Analisador IA - Veritas
// Modelos de Dados e Tipos TypeScript
// Mapeamento direto das entidades definidas na Seção 2.4.3
// ========================================================

export type TipoEntrada = 'TEXTO' | 'CAPTURA_OCR' | 'URL';

export type StatusAnalise = 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDA' | 'ERRO' | 'CANCELADA';

export type NivelRelevancia = 'BAIXO' | 'MEDIO' | 'ALTO';

export type TipoAgente = 'desinformacao' | 'fraude_digital' | 'link_suspeito';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  senha_hash: string;
  data_cadastro: Date;
}

export interface Agente {
  id: number;
  nome: string;
  descricao: string;
  tipo: TipoAgente;
  ativo: boolean;
}

export interface Analise {
  id: number;
  usuario_id: number;
  agente_id: number;
  tipo_entrada: TipoEntrada;
  conteudo?: string | null;
  url?: string | null;
  status: StatusAnalise;
  classificacao?: string | null;
  resultado?: string | null;
  data_criacao: Date;
  data_conclusao?: Date | null;
}

export interface Fonte {
  id: number;
  analise_id: number;
  titulo?: string | null;
  url: string;
  dominio?: string | null;
  avaliacao?: string | null;
  acessado_em: Date;
}

export interface Achado {
  id: number;
  analise_id: number;
  categoria?: string | null;
  descricao: string;
  nivel_relevancia: NivelRelevancia;
}

// DTOs para requisições e respostas da API
export interface RegisterDTO {
  nome: string;
  email: string;
  senha: string;
}

export interface LoginDTO {
  email: string;
  senha: string;
}

export interface AuthResponseDTO {
  token: string;
  usuario: {
    id: number;
    nome: string;
    email: string;
  };
}

export interface SolicitacaoAnaliseDTO {
  tipo_entrada: TipoEntrada;
  agente_id?: number;
  agente_tipo?: TipoAgente;
  conteudo?: string;
  url?: string;
}

export interface AnaliseCompletaDTO extends Analise {
  agente?: Agente;
  fontes: Fonte[];
  achados: Achado[];
}

export interface ResultadoAgente {
  classificacao: string;
  resultado: string;
  achados: Array<{
    categoria: string;
    descricao: string;
    nivel_relevancia: NivelRelevancia;
  }>;
  fontes: Array<{
    titulo: string;
    url: string;
    dominio: string;
    avaliacao: string;
  }>;
}
