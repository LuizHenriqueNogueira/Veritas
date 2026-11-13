// ========================================================
// Analisador IA - Veritas
// Gerenciador de Banco de Dados Persistente Local (SQLite)
// Garante persistência dos dados entre reinicializações do servidor (Seção 5.2)
// ========================================================

import { createRequire } from 'node:module';
// require evita que o Vite 5 (usado pelo Vitest 2) tente resolver o módulo
// nativo recente como um pacote npm chamado "sqlite".
const { DatabaseSync } = createRequire(__filename)('node:sqlite') as typeof import('node:sqlite');
import path from 'path';
import fs from 'fs';
import {applyMigrations} from './migrations.js';

// Garante que o diretório data/ exista relativo à raiz da aplicação
const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.SQLITE_DB_PATH || path.join(dataDir, 'veritas.db');
export const sqliteDb = new DatabaseSync(dbPath);

// Ativa chaves estrangeiras no SQLite
sqliteDb.exec('PRAGMA journal_mode = WAL');
sqliteDb.exec('PRAGMA foreign_keys = ON');
sqliteDb.exec('PRAGMA busy_timeout = 5000');

export function initSqliteDatabase() {
  const script = fs.readFileSync(path.join(__dirname, 'schema.sqlite.sql'), 'utf8');
  sqliteDb.exec(script);
  const hasMigrations=sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migration'").get();
  const pending=!hasMigrations || !sqliteDb.prepare('SELECT version FROM schema_migration WHERE version=1').get();
  if(pending && dbPath!==':memory:' && Number((sqliteDb.prepare('SELECT COUNT(*) AS total FROM analise').get() as any).total)>0){
    const folder=path.join(path.dirname(path.resolve(dbPath)),'backups');fs.mkdirSync(folder,{recursive:true});
    const filename=path.join(folder,`antes-v1.6-${Date.now()}.db`).replaceAll("'","''");
    sqliteDb.exec(`VACUUM INTO '${filename}'`);
  }
  applyMigrations(sqliteDb);
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
