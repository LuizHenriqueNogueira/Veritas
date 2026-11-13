import { it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
it('TI08: mantém usuário, análise, achados e referências após encerrar e reabrir processo', () => {
  const folder=mkdtempSync(path.join(tmpdir(),'veritas-db-test-'));
  const db=path.join(folder,'veritas.db');
  const modulePath=path.resolve('src/database/sqlite.ts');
  const repoPath=path.resolve('src/repositories/sqlite.repository.ts');
  const servicePath=path.resolve('src/services/analise.service.ts');
  const script=`
    const { initSqliteDatabase, sqliteDb }=require(${JSON.stringify(modulePath)});
    const r=require(${JSON.stringify(repoPath)});
    const { AnaliseService }=require(${JSON.stringify(servicePath)});
    (async()=>{
      initSqliteDatabase();
      const users=new r.SqliteUsuarioRepository();
      const service=new AnaliseService(new r.SqliteAnaliseRepository(),new r.SqliteAgenteRepository(),new r.SqliteFonteRepository(),new r.SqliteAchadoRepository());
      let user=await users.findByEmail('persistencia@example.test');
      if(!user){user=await users.create({nome:'Persistência',email:'persistencia@example.test',senha_hash:'hash-ficticio'});await service.criarEExecutarAnalise(user.id,{tipo_entrada:'TEXTO',agente_tipo:'fraude_digital',conteudo:'Sua conta será bloqueada. Digite sua senha.'});}
      const list=await service.listarAnalisesDoUsuario(user.id);
      const detail=await service.obterDetalhesAnalise(list[0].id,user.id);
      console.log(JSON.stringify({userId:user.id,id:detail.id,status:detail.status,achados:detail.achados.length,fontes:detail.fontes.length}));sqliteDb.close();
    })().catch(e=>{console.error(e);process.exit(1)});
  `;
  const run=()=>spawnSync(process.execPath,['--require','tsx/cjs','--eval',script],{encoding:'utf8',env:{...process.env,SQLITE_DB_PATH:db,AI_PROVIDER:'local'},timeout:30000});
  const first=run(); expect(first.status,first.stderr).toBe(0);
  const second=run(); expect(second.status,second.stderr).toBe(0);
  expect(JSON.parse(second.stdout.trim())).toEqual(JSON.parse(first.stdout.trim()));
  expect(JSON.parse(second.stdout.trim())).toMatchObject({status:'CONCLUIDA'});
  expect(JSON.parse(second.stdout.trim()).achados).toBeGreaterThan(0);
  expect(JSON.parse(second.stdout.trim()).fontes).toBeGreaterThan(0);
});
