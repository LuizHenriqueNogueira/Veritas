import {
  IUsuarioRepository,
  IAgenteRepository,
  IAnaliseRepository,
  IFonteRepository,
  IAchadoRepository
} from './interfaces.js';
import {
  MemoryUsuarioRepository,
  MemoryAgenteRepository,
  MemoryAnaliseRepository,
  MemoryFonteRepository,
  MemoryAchadoRepository
} from './memory.repository.js';
import {
  PostgresUsuarioRepository,
  PostgresAgenteRepository,
  PostgresAnaliseRepository,
  PostgresFonteRepository,
  PostgresAchadoRepository
} from './postgres.repository.js';
import {
  SqliteUsuarioRepository,
  SqliteAgenteRepository,
  SqliteAnaliseRepository,
  SqliteFonteRepository,
  SqliteAchadoRepository
} from './sqlite.repository.js';
import { initSqliteDatabase } from '../database/sqlite.js';

const usePostgres = process.env.USE_POSTGRES === 'true';

if (!usePostgres && process.env.NODE_ENV !== 'test') {
  initSqliteDatabase();
}

export const usuarioRepository: IUsuarioRepository = usePostgres
  ? new PostgresUsuarioRepository()
  : new SqliteUsuarioRepository();

export const agenteRepository: IAgenteRepository = usePostgres
  ? new PostgresAgenteRepository()
  : new SqliteAgenteRepository();

export const analiseRepository: IAnaliseRepository = usePostgres
  ? new PostgresAnaliseRepository()
  : new SqliteAnaliseRepository();

export const fonteRepository: IFonteRepository = usePostgres
  ? new PostgresFonteRepository()
  : new SqliteFonteRepository();

export const achadoRepository: IAchadoRepository = usePostgres
  ? new PostgresAchadoRepository()
  : new SqliteAchadoRepository();

export * from './interfaces.js';
export {
  MemoryUsuarioRepository,
  MemoryAgenteRepository,
  MemoryAnaliseRepository,
  MemoryFonteRepository,
  MemoryAchadoRepository,
  SqliteUsuarioRepository,
  SqliteAgenteRepository,
  SqliteAnaliseRepository,
  SqliteFonteRepository,
  SqliteAchadoRepository,
  PostgresUsuarioRepository,
  PostgresAgenteRepository,
  PostgresAnaliseRepository,
  PostgresFonteRepository,
  PostgresAchadoRepository
};
