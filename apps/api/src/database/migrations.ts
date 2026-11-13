import type {DatabaseSync} from 'node:sqlite';
export function applyMigrations(db:DatabaseSync){
  db.exec('CREATE TABLE IF NOT EXISTS schema_migration(version INTEGER PRIMARY KEY,nome TEXT NOT NULL,aplicada_em TEXT NOT NULL)');
  const migrations=[{version:1,name:'contexto_lixeira_feedback',run:()=>{
    const columns=(db.prepare('PRAGMA table_info(analise)').all() as any[]).map(x=>x.name);
    if(!columns.includes('contexto'))db.exec('ALTER TABLE analise ADD COLUMN contexto TEXT');
    if(!columns.includes('excluida_em'))db.exec('ALTER TABLE analise ADD COLUMN excluida_em TEXT');
    db.exec(`CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,analise_id INTEGER NOT NULL UNIQUE,usuario_id INTEGER NOT NULL,
      util INTEGER NOT NULL CHECK(util IN (0,1)),comentario TEXT NOT NULL DEFAULT '',
      data_criacao TEXT NOT NULL,data_atualizacao TEXT NOT NULL,
      FOREIGN KEY(analise_id) REFERENCES analise(id) ON DELETE CASCADE,
      FOREIGN KEY(usuario_id) REFERENCES usuario(id) ON DELETE CASCADE);
      CREATE INDEX IF NOT EXISTS idx_analise_lixeira ON analise(usuario_id,excluida_em);
      CREATE INDEX IF NOT EXISTS idx_feedback_usuario ON feedback(usuario_id);`);
  }}];
  for(const m of migrations){
    if(db.prepare('SELECT version FROM schema_migration WHERE version=?').get(m.version))continue;
    db.exec('BEGIN IMMEDIATE');try{m.run();db.prepare('INSERT INTO schema_migration VALUES(?,?,?)').run(m.version,m.name,new Date().toISOString());db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
  }
}
