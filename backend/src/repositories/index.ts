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

const usePostgres = process.env.NODE_ENV === 'production' || process.env.USE_POSTGRES === 'true';

export const usuarioRepository: IUsuarioRepository = usePostgres
  ? new PostgresUsuarioRepository()
  : new MemoryUsuarioRepository();

export const agenteRepository: IAgenteRepository = usePostgres
  ? new PostgresAgenteRepository()
  : new MemoryAgenteRepository();

export const analiseRepository: IAnaliseRepository = usePostgres
  ? new PostgresAnaliseRepository()
  : new MemoryAnaliseRepository();

export const fonteRepository: IFonteRepository = usePostgres
  ? new PostgresFonteRepository()
  : new MemoryFonteRepository();

export const achadoRepository: IAchadoRepository = usePostgres
  ? new PostgresAchadoRepository()
  : new MemoryAchadoRepository();

export * from './interfaces.js';
export {
  MemoryUsuarioRepository,
  MemoryAgenteRepository,
  MemoryAnaliseRepository,
  MemoryFonteRepository,
  MemoryAchadoRepository
};
