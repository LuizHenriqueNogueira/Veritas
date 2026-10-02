import { Usuario, Agente, Analise, Fonte, Achado, StatusAnalise } from '../models/index.js';

export interface IUsuarioRepository {
  findById(id: number): Promise<Usuario | null>;
  findByEmail(email: string): Promise<Usuario | null>;
  create(usuario: Omit<Usuario, 'id' | 'data_cadastro'>): Promise<Usuario>;
}

export interface IAgenteRepository {
  findAll(): Promise<Agente[]>;
  findById(id: number): Promise<Agente | null>;
  findByTipo(tipo: string): Promise<Agente | null>;
}

export interface IAnaliseRepository {
  findById(id: number): Promise<Analise | null>;
  findByUsuarioId(usuarioId: number, options?: { agenteId?: number; busca?: string }): Promise<Analise[]>;
  create(analise: Omit<Analise, 'id' | 'data_criacao'>): Promise<Analise>;
  updateStatus(id: number, status: StatusAnalise, classificacao?: string, resultado?: string, dataConclusao?: Date): Promise<Analise | null>;
}

export interface IFonteRepository {
  findByAnaliseId(analiseId: number): Promise<Fonte[]>;
  create(fonte: Omit<Fonte, 'id' | 'acessado_em'>): Promise<Fonte>;
}

export interface IAchadoRepository {
  findByAnaliseId(analiseId: number): Promise<Achado[]>;
  create(achado: Omit<Achado, 'id'>): Promise<Achado>;
}
