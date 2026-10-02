import { Usuario, Agente, Analise, Fonte, Achado, StatusAnalise } from '../models/index.js';
import {
  IUsuarioRepository,
  IAgenteRepository,
  IAnaliseRepository,
  IFonteRepository,
  IAchadoRepository
} from './interfaces.js';

export class MemoryUsuarioRepository implements IUsuarioRepository {
  private usuarios: Usuario[] = [];
  private nextId = 1;

  async findById(id: number): Promise<Usuario | null> {
    return this.usuarios.find(u => u.id === id) || null;
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    const normalized = email.trim().toLowerCase();
    return this.usuarios.find(u => u.email.toLowerCase() === normalized) || null;
  }

  async create(data: Omit<Usuario, 'id' | 'data_cadastro'>): Promise<Usuario> {
    const usuario: Usuario = {
      id: this.nextId++,
      nome: data.nome.trim(),
      email: data.email.trim().toLowerCase(),
      senha_hash: data.senha_hash,
      data_cadastro: new Date()
    };
    this.usuarios.push(usuario);
    return { ...usuario };
  }

  clear() {
    this.usuarios = [];
    this.nextId = 1;
  }
}

export class MemoryAgenteRepository implements IAgenteRepository {
  private agentes: Agente[] = [
    {
      id: 1,
      nome: 'Desinformação',
      descricao: 'Analisa possíveis indícios de informações falsas, distorcidas, descontextualizadas ou não confirmadas.',
      tipo: 'desinformacao',
      ativo: true
    },
    {
      id: 2,
      nome: 'Fraude Digital',
      descricao: 'Analisa possíveis indícios de golpes, phishing e engenharia social.',
      tipo: 'fraude_digital',
      ativo: true
    },
    {
      id: 3,
      nome: 'Link Suspeito',
      descricao: 'Analisa URLs e domínios procurando possíveis indicadores de risco.',
      tipo: 'link_suspeito',
      ativo: true
    }
  ];

  async findAll(): Promise<Agente[]> {
    return [...this.agentes.filter(a => a.ativo)];
  }

  async findById(id: number): Promise<Agente | null> {
    return this.agentes.find(a => a.id === id) || null;
  }

  async findByTipo(tipo: string): Promise<Agente | null> {
    return this.agentes.find(a => a.tipo === tipo) || null;
  }
}

export class MemoryAnaliseRepository implements IAnaliseRepository {
  private analises: Analise[] = [];
  private nextId = 1;

  async findById(id: number): Promise<Analise | null> {
    const item = this.analises.find(a => a.id === id);
    return item ? { ...item } : null;
  }

  async findByUsuarioId(
    usuarioId: number,
    options?: { agenteId?: number; busca?: string }
  ): Promise<Analise[]> {
    let result = this.analises.filter(a => a.usuario_id === usuarioId);

    if (options?.agenteId) {
      result = result.filter(a => a.agente_id === options.agenteId);
    }

    if (options?.busca && options.busca.trim().length > 0) {
      const term = options.busca.toLowerCase();
      result = result.filter(
        a =>
          (a.conteudo && a.conteudo.toLowerCase().includes(term)) ||
          (a.url && a.url.toLowerCase().includes(term)) ||
          (a.classificacao && a.classificacao.toLowerCase().includes(term)) ||
          (a.resultado && a.resultado.toLowerCase().includes(term))
      );
    }

    // Ordenar pelas mais recentes primeiro
    return result
      .sort((a, b) => b.data_criacao.getTime() - a.data_criacao.getTime())
      .map(a => ({ ...a }));
  }

  async create(data: Omit<Analise, 'id' | 'data_criacao'>): Promise<Analise> {
    const analise: Analise = {
      id: this.nextId++,
      usuario_id: data.usuario_id,
      agente_id: data.agente_id,
      tipo_entrada: data.tipo_entrada,
      conteudo: data.conteudo ?? null,
      url: data.url ?? null,
      status: data.status,
      classificacao: data.classificacao ?? null,
      resultado: data.resultado ?? null,
      data_criacao: new Date(),
      data_conclusao: data.data_conclusao ?? null
    };
    this.analises.push(analise);
    return { ...analise };
  }

  async updateStatus(
    id: number,
    status: StatusAnalise,
    classificacao?: string,
    resultado?: string,
    dataConclusao?: Date
  ): Promise<Analise | null> {
    const index = this.analises.findIndex(a => a.id === id);
    if (index === -1) return null;

    this.analises[index] = {
      ...this.analises[index],
      status,
      ...(classificacao !== undefined && { classificacao }),
      ...(resultado !== undefined && { resultado }),
      ...(dataConclusao !== undefined && { data_conclusao: dataConclusao })
    };

    return { ...this.analises[index] };
  }

  clear() {
    this.analises = [];
    this.nextId = 1;
  }
}

export class MemoryFonteRepository implements IFonteRepository {
  private fontes: Fonte[] = [];
  private nextId = 1;

  async findByAnaliseId(analiseId: number): Promise<Fonte[]> {
    return this.fontes.filter(f => f.analise_id === analiseId).map(f => ({ ...f }));
  }

  async create(data: Omit<Fonte, 'id' | 'acessado_em'>): Promise<Fonte> {
    const fonte: Fonte = {
      id: this.nextId++,
      analise_id: data.analise_id,
      titulo: data.titulo ?? null,
      url: data.url,
      dominio: data.dominio ?? null,
      avaliacao: data.avaliacao ?? null,
      acessado_em: new Date()
    };
    this.fontes.push(fonte);
    return { ...fonte };
  }

  clear() {
    this.fontes = [];
    this.nextId = 1;
  }
}

export class MemoryAchadoRepository implements IAchadoRepository {
  private achados: Achado[] = [];
  private nextId = 1;

  async findByAnaliseId(analiseId: number): Promise<Achado[]> {
    return this.achados.filter(a => a.analise_id === analiseId).map(a => ({ ...a }));
  }

  async create(data: Omit<Achado, 'id'>): Promise<Achado> {
    const achado: Achado = {
      id: this.nextId++,
      analise_id: data.analise_id,
      categoria: data.categoria ?? null,
      descricao: data.descricao,
      nivel_relevancia: data.nivel_relevancia
    };
    this.achados.push(achado);
    return { ...achado };
  }

  clear() {
    this.achados = [];
    this.nextId = 1;
  }
}
