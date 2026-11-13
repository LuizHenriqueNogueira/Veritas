import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync,mkdtempSync,readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
const {DatabaseSync}=createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
it('MG01: migra banco legado com backup, preserva dados e mantém feedback/lixeira após reiniciar',()=>{
 const folder=mkdtempSync(path.join(tmpdir(),'veritas-v16-')),dbPath=path.join(folder,'veritas.db');const old=new DatabaseSync(dbPath);
 old.exec(readFileSync(path.resolve('src/database/schema.sqlite.sql'),'utf8'));
 old.exec(`INSERT INTO usuario VALUES(1,'Usuário preservado','legado@example.test','hash-legado','2026-10-16');
 INSERT INTO agente VALUES(3,'Link Suspeito','Teste','link_suspeito',1);
 INSERT INTO analise VALUES(1,1,3,'URL',NULL,'https://example.com','CONCLUIDA','Inconclusivo','Parecer preservado','2026-10-16',NULL);
 INSERT INTO fonte VALUES(1,1,'Fonte preservada','https://fonte.example.test','fonte.example.test','Trecho original','2026-10-16');`);old.close();
 const dbModule=path.resolve('src/database/sqlite.ts'),repos=path.resolve('src/repositories/sqlite.repository.ts'),feedback=path.resolve('src/repositories/feedback.repository.ts'),history=path.resolve('src/services/history.service.ts');
 const script=`const {initSqliteDatabase,sqliteDb}=require(${JSON.stringify(dbModule)});const {SqliteAnaliseRepository}=require(${JSON.stringify(repos)});const {SqliteFeedbackRepository}=require(${JSON.stringify(feedback)});const {HistoryService}=require(${JSON.stringify(history)});
 (async()=>{initSqliteDatabase();initSqliteDatabase();const repo=new SqliteAnaliseRepository(),h=new HistoryService(repo,new SqliteFeedbackRepository());const existing=await h.getFeedback(1,1);if(!existing){sqliteDb.prepare('UPDATE analise SET contexto=? WHERE id=1').run('Contexto preservado');await h.saveFeedback(1,1,false,'A fonte precisa de data mais recente.');await h.exclude(1,1);}console.log(JSON.stringify({analise:await repo.findById(1),trash:await repo.findByUsuarioId(1,{excluidas:true}),feedback:sqliteDb.prepare('SELECT * FROM feedback').all(),fontes:sqliteDb.prepare('SELECT * FROM fonte').all(),migrations:sqliteDb.prepare('SELECT * FROM schema_migration').all()}));sqliteDb.close();})().catch(e=>{console.error(e);process.exit(1)});`;
 // Segunda execução já inicia com pesquisa excluída: consultar diretamente evita expor detalhes excluídos.
 const secondScript=script.replace('const existing=await h.getFeedback(1,1);','const existing=sqliteDb.prepare("SELECT * FROM feedback WHERE analise_id=1").get();');
 const run=(code:string)=>spawnSync(process.execPath,['--require','tsx/cjs','--eval',code],{encoding:'utf8',env:{...process.env,SQLITE_DB_PATH:dbPath},timeout:30000});
 const first=run(script),second=run(secondScript);expect(first.status,first.stderr).toBe(0);expect(second.status,second.stderr).toBe(0);
 const saved=JSON.parse(first.stdout.trim());expect(JSON.parse(second.stdout.trim())).toEqual(saved);expect(saved.analise).toMatchObject({id:1,usuario_id:1,resultado:'Parecer preservado',contexto:'Contexto preservado'});expect(saved.trash).toHaveLength(1);expect(saved.feedback[0]).toMatchObject({util:0,comentario:'A fonte precisa de data mais recente.'});expect(saved.fontes[0].titulo).toBe('Fonte preservada');expect(saved.migrations).toHaveLength(1);
 const backups=readdirSync(path.join(folder,'backups'));expect(backups).toHaveLength(1);const backup=new DatabaseSync(path.join(folder,'backups',backups[0]));expect((backup.prepare('SELECT * FROM analise WHERE id=1').get() as any).resultado).toBe('Parecer preservado');expect(backup.prepare("SELECT name FROM sqlite_master WHERE name='feedback'").get()).toBeUndefined();backup.close();
},30000);
