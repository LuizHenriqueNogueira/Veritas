import { sqliteDb } from '../database/sqlite.js';
import { Usuario, Agente, Analise, Fonte, Achado, StatusAnalise } from '../models/index.js';
import {
  IUsuarioRepository,
  IAgenteRepository,
  IAnaliseRepository,
  IFonteRepository,
  IAchadoRepository
} from './interfaces.js';

export class SqliteUsuarioRepository implements IUsuarioRepository {
  async findById(id: number): Promise<Usuario | null> {
    const row = sqliteDb.prepare('SELECT * FROM usuario WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      ...row,
      data_cadastro: new Date(row.data_cadastro)
    };
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    const row = sqliteDb
      .prepare('SELECT * FROM usuario WHERE LOWER(email) = LOWER(?)')
      .get(email.trim()) as any;
    if (!row) return null;
    return {
      ...row,
      data_cadastro: new Date(row.data_cadastro)
    };
  }

  async create(data: Omit<Usuario, 'id' | 'data_cadastro'>): Promise<Usuario> {
    const now = new Date().toISOString();
    const info = sqliteDb
      .prepare('INSERT INTO usuario (nome, email, senha_hash, data_cadastro) VALUES (?, ?, ?, ?)')
      .run(data.nome.trim(), data.email.trim().toLowerCase(), data.senha_hash, now);

    return {
      id: Number(info.lastInsertRowid),
      nome: data.nome.trim(),
      email: data.email.trim().toLowerCase(),
      senha_hash: data.senha_hash,
      data_cadastro: new Date(now)
    };
  }
}

export class SqliteAgenteRepository implements IAgenteRepository {
  async findAll(): Promise<Agente[]> {
    const rows = sqliteDb.prepare('SELECT * FROM agente WHERE ativo = 1 ORDER BY id ASC').all() as any[];
    return rows.map(r => ({ ...r, ativo: Boolean(r.ativo) }));
  }

  async findById(id: number): Promise<Agente | null> {
    const row = sqliteDb.prepare('SELECT * FROM agente WHERE id = ?').get(id) as any;
    if (!row) return null;
    return { ...row, ativo: Boolean(row.ativo) };
  }

  async findByTipo(tipo: string): Promise<Agente | null> {
    const row = sqliteDb.prepare('SELECT * FROM agente WHERE tipo = ?').get(tipo) as any;
    if (!row) return null;
    return { ...row, ativo: Boolean(row.ativo) };
  }
}

export class SqliteAnaliseRepository implements IAnaliseRepository {
  async findById(id: number): Promise<Analise | null> {
    const row = sqliteDb.prepare('SELECT * FROM analise WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      ...row,
      data_criacao: new Date(row.data_criacao),
      data_conclusao: row.data_conclusao ? new Date(row.data_conclusao) : null
    };
  }

  async findByUsuarioId(
    usuarioId: number,
    options?: { agenteId?: number; busca?: string }
  ): Promise<Analise[]> {
    let sql = 'SELECT * FROM analise WHERE usuario_id = ?';
    const params: any[] = [usuarioId];

    if (options?.agenteId) {
      sql += ' AND agente_id = ?';
      params.push(options.agenteId);
    }

    if (options?.busca && options.busca.trim().length > 0) {
      sql += ' AND (conteudo LIKE ? OR url LIKE ? OR classificacao LIKE ? OR resultado LIKE ?)';
      const term = `%${options.busca.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY data_criacao DESC';
    const rows = sqliteDb.prepare(sql).all(...params) as any[];

    return rows.map(row => ({
      ...row,
      data_criacao: new Date(row.data_criacao),
      data_conclusao: row.data_conclusao ? new Date(row.data_conclusao) : null
    }));
  }

  async create(data: Omit<Analise, 'id' | 'data_criacao'>): Promise<Analise> {
    const now = new Date().toISOString();
    const info = sqliteDb
      .prepare(`
        INSERT INTO analise (usuario_id, agente_id, tipo_entrada, conteudo, url, status, classificacao, resultado, data_criacao, data_conclusao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        data.usuario_id,
        data.agente_id,
        data.tipo_entrada,
        data.conteudo ?? null,
        data.url ?? null,
        data.status,
        data.classificacao ?? null,
        data.resultado ?? null,
        now,
        data.data_conclusao ? data.data_conclusao.toISOString() : null
      );

    return {
      id: Number(info.lastInsertRowid),
      usuario_id: data.usuario_id,
      agente_id: data.agente_id,
      tipo_entrada: data.tipo_entrada,
      conteudo: data.conteudo ?? null,
      url: data.url ?? null,
      status: data.status,
      classificacao: data.classificacao ?? null,
      resultado: data.resultado ?? null,
      data_criacao: new Date(now),
      data_conclusao: data.data_conclusao ?? null
    };
  }

  async updateStatus(
    id: number,
    status: StatusAnalise,
    classificacao?: string,
    resultado?: string,
    dataConclusao?: Date
  ): Promise<Analise | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const concl = dataConclusao ? dataConclusao.toISOString() : existing.data_conclusao ? existing.data_conclusao.toISOString() : null;

    sqliteDb
      .prepare(`
        UPDATE analise
        SET status = ?,
            classificacao = COALESCE(?, classificacao),
            resultado = COALESCE(?, resultado),
            data_conclusao = COALESCE(?, data_conclusao)
        WHERE id = ?
      `)
      .run(
        status,
        classificacao !== undefined ? classificacao : null,
        resultado !== undefined ? resultado : null,
        concl,
        id
      );

    return this.findById(id);
  }
}

export class SqliteFonteRepository implements IFonteRepository {
  async findByAnaliseId(analiseId: number): Promise<Fonte[]> {
    const rows = sqliteDb
      .prepare('SELECT * FROM fonte WHERE analise_id = ? ORDER BY id ASC')
      .all(analiseId) as any[];
    return rows.map(r => ({
      ...r,
      acessado_em: new Date(r.acessado_em)
    }));
  }

  async create(data: Omit<Fonte, 'id' | 'acessado_em'>): Promise<Fonte> {
    const now = new Date().toISOString();
    const info = sqliteDb
      .prepare(`
        INSERT INTO fonte (analise_id, titulo, url, dominio, avaliacao, acessado_em)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(data.analise_id, data.titulo ?? null, data.url, data.dominio ?? null, data.avaliacao ?? null, now);

    return {
      id: Number(info.lastInsertRowid),
      analise_id: data.analise_id,
      titulo: data.titulo ?? null,
      url: data.url,
      dominio: data.dominio ?? null,
      avaliacao: data.avaliacao ?? null,
      acessado_em: new Date(now)
    };
  }
}

export class SqliteAchadoRepository implements IAchadoRepository {
  async findByAnaliseId(analiseId: number): Promise<Achado[]> {
    const rows = sqliteDb
      .prepare('SELECT * FROM achado WHERE analise_id = ? ORDER BY id ASC')
      .all(analiseId) as any[];
    return rows;
  }

  async create(data: Omit<Achado, 'id'>): Promise<Achado> {
    const info = sqliteDb
      .prepare(`
        INSERT INTO achado (analise_id, categoria, descricao, nivel_relevancia)
        VALUES (?, ?, ?, ?)
      `)
      .run(data.analise_id, data.categoria ?? null, data.descricao, data.nivel_relevancia);

    return {
      id: Number(info.lastInsertRowid),
      analise_id: data.analise_id,
      categoria: data.categoria ?? null,
      descricao: data.descricao,
      nivel_relevancia: data.nivel_relevancia
    };
  }
}
