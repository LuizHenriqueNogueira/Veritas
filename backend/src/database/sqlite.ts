// ========================================================
// Analisador IA - Veritas
// Gerenciador de Banco de Dados Persistente Local (SQLite)
// Garante persistência dos dados entre reinicializações do servidor (Seção 5.2)
// ========================================================

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Garante que o diretório data/ exista relativo à raiz da aplicação
const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.SQLITE_DB_PATH || path.join(dataDir, 'veritas.db');
export const sqliteDb = new Database(dbPath);

// Ativa chaves estrangeiras no SQLite
sqliteDb.pragma('journal_mode = WAL');
sqliteDb.pragma('foreign_keys = ON');

export function initSqliteDatabase() {
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS usuario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      data_cadastro DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agente (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      descricao TEXT NOT NULL,
      tipo TEXT NOT NULL UNIQUE,
      ativo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS analise (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      agente_id INTEGER NOT NULL,
      tipo_entrada TEXT NOT NULL,
      conteudo TEXT,
      url TEXT,
      status TEXT NOT NULL DEFAULT 'PENDENTE',
      classificacao TEXT,
      resultado TEXT,
      data_criacao DATETIME NOT NULL,
      data_conclusao DATETIME,
      FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
      FOREIGN KEY (agente_id) REFERENCES agente(id)
    );

    CREATE TABLE IF NOT EXISTS fonte (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analise_id INTEGER NOT NULL,
      titulo TEXT,
      url TEXT NOT NULL,
      dominio TEXT,
      avaliacao TEXT,
      acessado_em DATETIME NOT NULL,
      FOREIGN KEY (analise_id) REFERENCES analise(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS achado (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analise_id INTEGER NOT NULL,
      categoria TEXT,
      descricao TEXT NOT NULL,
      nivel_relevancia TEXT NOT NULL,
      FOREIGN KEY (analise_id) REFERENCES analise(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_analise_user ON analise(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_analise_agente ON analise(agente_id);
    CREATE INDEX IF NOT EXISTS idx_fonte_analise ON fonte(analise_id);
    CREATE INDEX IF NOT EXISTS idx_achado_analise ON achado(analise_id);
  `);

  // Carga inicial dos 3 agentes (Seção 2.4.3)
  const count = sqliteDb.prepare('SELECT count(*) as total FROM agente').get() as { total: number };
  if (count.total === 0) {
    const insertAgente = sqliteDb.prepare(`
      INSERT INTO agente (id, nome, descricao, tipo, ativo) VALUES (?, ?, ?, ?, ?)
    `);

    insertAgente.run(
      1,
      'Desinformação',
      'Analisa possíveis indícios de informações falsas, distorcidas, descontextualizadas ou não confirmadas.',
      'desinformacao',
      1
    );
    insertAgente.run(
      2,
      'Fraude Digital',
      'Analisa possíveis indícios de golpes, phishing e engenharia social.',
      'fraude_digital',
      1
    );
    insertAgente.run(
      3,
      'Link Suspeito',
      'Analisa URLs e domínios procurando possíveis indicadores de risco.',
      'link_suspeito',
      1
    );
  }
}
