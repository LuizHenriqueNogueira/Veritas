import 'dotenv/config';
import { initSqliteDatabase, sqliteDb } from './sqlite.js';
initSqliteDatabase();
console.log('Banco SQLite criado/atualizado com os três agentes.');
sqliteDb.close();
