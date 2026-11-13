// ========================================================
// Analisador IA - Veritas
// Gerenciador de Conexão com Banco de Dados e Camada de Acesso
// Suporta PostgreSQL e memória (para testes unitários isolados)
// ========================================================

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/veritas';

export const pool = new Pool({
  connectionString,
  // Timeout curto para fallback seguro se não houver Postgres local ativo
  connectionTimeoutMillis: 3000,
});

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}
