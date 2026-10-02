import { pool } from '../database/db.js';
import { Usuario, Agente, Analise, Fonte, Achado, StatusAnalise } from '../models/index.js';
import {
  IUsuarioRepository,
  IAgenteRepository,
  IAnaliseRepository,
  IFonteRepository,
  IAchadoRepository
} from './interfaces.js';

export class PostgresUsuarioRepository implements IUsuarioRepository {
  async findById(id: number): Promise<Usuario | null> {
    const res = await pool.query('SELECT * FROM usuario WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    const res = await pool.query('SELECT * FROM usuario WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    return res.rows[0] || null;
  }

  async create(data: Omit<Usuario, 'id' | 'data_cadastro'>): Promise<Usuario> {
    const res = await pool.query(
      `INSERT INTO usuario (nome, email, senha_hash, data_cadastro)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [data.nome.trim(), data.email.trim().toLowerCase(), data.senha_hash]
    );
    return res.rows[0];
  }
}

export class PostgresAgenteRepository implements IAgenteRepository {
  async findAll(): Promise<Agente[]> {
    const res = await pool.query('SELECT * FROM agente WHERE ativo = TRUE ORDER BY id ASC');
    return res.rows;
  }

  async findById(id: number): Promise<Agente | null> {
    const res = await pool.query('SELECT * FROM agente WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async findByTipo(tipo: string): Promise<Agente | null> {
    const res = await pool.query('SELECT * FROM agente WHERE tipo = $1', [tipo]);
    return res.rows[0] || null;
  }
}

export class PostgresAnaliseRepository implements IAnaliseRepository {
  async findById(id: number): Promise<Analise | null> {
    const res = await pool.query('SELECT * FROM analise WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async findByUsuarioId(
    usuarioId: number,
    options?: { agenteId?: number; busca?: string }
  ): Promise<Analise[]> {
    let sql = 'SELECT * FROM analise WHERE usuario_id = $1';
    const params: any[] = [usuarioId];

    if (options?.agenteId) {
      params.push(options.agenteId);
      sql += ` AND agente_id = $${params.length}`;
    }

    if (options?.busca && options.busca.trim().length > 0) {
      params.push(`%${options.busca.trim()}%`);
      sql += ` AND (conteudo ILIKE $${params.length} OR url ILIKE $${params.length} OR classificacao ILIKE $${params.length} OR resultado ILIKE $${params.length})`;
    }

    sql += ' ORDER BY data_criacao DESC';
    const res = await pool.query(sql, params);
    return res.rows;
  }

  async create(data: Omit<Analise, 'id' | 'data_criacao'>): Promise<Analise> {
    const res = await pool.query(
      `INSERT INTO analise (usuario_id, agente_id, tipo_entrada, conteudo, url, status, classificacao, resultado, data_criacao, data_conclusao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
       RETURNING *`,
      [
        data.usuario_id,
        data.agente_id,
        data.tipo_entrada,
        data.conteudo ?? null,
        data.url ?? null,
        data.status,
        data.classificacao ?? null,
        data.resultado ?? null,
        data.data_conclusao ?? null
      ]
    );
    return res.rows[0];
  }

  async updateStatus(
    id: number,
    status: StatusAnalise,
    classificacao?: string,
    resultado?: string,
    dataConclusao?: Date
  ): Promise<Analise | null> {
    const res = await pool.query(
      `UPDATE analise
       SET status = $1,
           classificacao = COALESCE($2, classificacao),
           resultado = COALESCE($3, resultado),
           data_conclusao = COALESCE($4, data_conclusao)
       WHERE id = $5
       RETURNING *`,
      [status, classificacao ?? null, resultado ?? null, dataConclusao ?? null, id]
    );
    return res.rows[0] || null;
  }
}

export class PostgresFonteRepository implements IFonteRepository {
  async findByAnaliseId(analiseId: number): Promise<Fonte[]> {
    const res = await pool.query('SELECT * FROM fonte WHERE analise_id = $1 ORDER BY id ASC', [analiseId]);
    return res.rows;
  }

  async create(data: Omit<Fonte, 'id' | 'acessado_em'>): Promise<Fonte> {
    const res = await pool.query(
      `INSERT INTO fonte (analise_id, titulo, url, dominio, avaliacao, acessado_em)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [data.analise_id, data.titulo ?? null, data.url, data.dominio ?? null, data.avaliacao ?? null]
    );
    return res.rows[0];
  }
}

export class PostgresAchadoRepository implements IAchadoRepository {
  async findByAnaliseId(analiseId: number): Promise<Achado[]> {
    const res = await pool.query('SELECT * FROM achado WHERE analise_id = $1 ORDER BY id ASC', [analiseId]);
    return res.rows;
  }

  async create(data: Omit<Achado, 'id'>): Promise<Achado> {
    const res = await pool.query(
      `INSERT INTO achado (analise_id, categoria, descricao, nivel_relevancia)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.analise_id, data.categoria ?? null, data.descricao, data.nivel_relevancia]
    );
    return res.rows[0];
  }
}
