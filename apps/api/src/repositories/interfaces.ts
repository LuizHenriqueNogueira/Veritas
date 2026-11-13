import { Usuario, Agente, Analise, Fonte, Achado, StatusAnalise,Feedback } from '../models/index.js';

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
  findByUsuarioId(usuarioId: number, options?: { agenteId?: number; busca?: string; excluidas?:boolean }): Promise<Analise[]>;
  setExcluded(id:number,usuarioId:number,excludedAt:string|null):Promise<boolean>;
  create(analise: Omit<Analise, 'id' | 'data_criacao'>): Promise<Analise>;
  updateStatus(id: number, status: StatusAnalise, classificacao?: string, resultado?: string, dataConclusao?: Date): Promise<Analise | null>;
}

export interface IFeedbackRepository {
  find(analiseId:number,usuarioId:number):Promise<Feedback|null>;
  save(analiseId:number,usuarioId:number,util:boolean,comentario:string):Promise<Feedback>;
}

export interface IFonteRepository {
  findByAnaliseId(analiseId: number): Promise<Fonte[]>;
  create(fonte: Omit<Fonte, 'id' | 'acessado_em'>): Promise<Fonte>;
}

export interface IAchadoRepository {
  findByAnaliseId(analiseId: number): Promise<Achado[]>;
  create(achado: Omit<Achado, 'id'>): Promise<Achado>;
}
