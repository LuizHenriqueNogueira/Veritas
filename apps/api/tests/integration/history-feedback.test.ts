import {beforeAll,afterAll,it,expect} from 'vitest';
import type {Server} from 'node:http';
import app from '../../src/app.js';
import {sqliteDb} from '../../src/database/sqlite.js';
let server:Server,base:string,a:string,b:string,id:number;
async function call(path:string,method='GET',body?:unknown,token=a){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json() as any};}
beforeAll(async()=>{server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.on('listening',r));base=`http://127.0.0.1:${(server.address() as any).port}/api`;
 a=(await call('/auth/register','POST',{nome:'Ana',email:'ana-history@example.test',senha:'SenhaTeste123'},'')).data.token;
 b=(await call('/auth/register','POST',{nome:'Beto',email:'beto-history@example.test',senha:'SenhaTeste123'},'')).data.token;
 id=(await call('/analises','POST',{tipo_entrada:'TEXTO',agente_tipo:'fraude_digital',conteudo:'Sua conta será bloqueada. Informe sua senha e token agora.'})).data.id;
});
afterAll(async()=>{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));});
it('HF01: não há feedback inicial e todas as rotas exigem autenticação',async()=>{
 expect((await call(`/analises/${id}/feedback`)).data).toBeNull();
 for(const [path,method] of [[`/analises/${id}`,'DELETE'],[`/analises/${id}/feedback`,'PUT'],[`/analises/${id}/restaurar`,'POST']])expect((await call(path,method,{},'')).status).toBe(401);
});
it('HF02: Não exige comentário descritivo e valida tipo e tamanho no servidor',async()=>{
 for(const body of [{util:false},{util:false,comentario:'    '},{util:false,comentario:'abcd'},{util:'não',comentario:'Problema'},{util:true,comentario:123},{util:false,comentario:'x'.repeat(1001)}])expect((await call(`/analises/${id}/feedback`,'PUT',body)).status).toBe(400);
 expect((await call(`/analises/${id}/feedback`)).data).toBeNull();
});
it('HF03: salva Não com comentário e permite editar sem duplicar avaliações',async()=>{
 const first=await call(`/analises/${id}/feedback`,'PUT',{util:false,comentario:'  Não considerou a data da mensagem.  '});expect(first.status).toBe(200);expect(first.data).toMatchObject({analise_id:id,util:false,comentario:'Não considerou a data da mensagem.'});
 const second=await call(`/analises/${id}/feedback`,'PUT',{util:true,comentario:''});expect(second.data.id).toBe(first.data.id);expect((await call(`/analises/${id}/feedback`)).data.util).toBe(true);
 expect((sqliteDb.prepare('SELECT COUNT(*) AS total FROM feedback WHERE analise_id=?').get(id) as any).total).toBe(1);
});
it('HF04: outra conta não lê, avalia, exclui ou restaura a pesquisa',async()=>{
 for(const [path,method,body] of [[`/analises/${id}/feedback`,'GET',undefined],[`/analises/${id}/feedback`,'PUT',{util:false,comentario:'Comentário indevido'}],[`/analises/${id}`,'DELETE',undefined],[`/analises/${id}/restaurar`,'POST',{}]] as const)expect((await call(path,method,body,b)).status).toBe(404);
 expect((await call('/analises','GET',undefined,b)).data).toEqual([]);
});
it('HF05: exclusão retira do histórico e detalhes, mas conserva feedback e referências na lixeira',async()=>{
 const before=(await call(`/analises/${id}`)).data;
 expect((await call(`/analises/${id}`,'DELETE')).status).toBe(200);
 expect((await call('/analises')).data.some((x:any)=>x.id===id)).toBe(false);
 expect((await call('/analises?excluidas=true')).data.map((x:any)=>x.id)).toContain(id);
 expect((await call(`/analises/${id}`)).status).toBe(404);
 expect((await call(`/analises/${id}/feedback`)).status).toBe(404);
 expect((await call(`/analises/${id}/feedback`,'PUT',{util:true})).status).toBe(404);
 expect((await call(`/analises/${id}/restaurar`,'POST',{})).status).toBe(200);
 const after=(await call(`/analises/${id}`)).data;expect(after.fontes).toEqual(before.fontes);expect(after.achados).toEqual(before.achados);
 expect((await call(`/analises/${id}/feedback`)).data.util).toBe(true);expect((await call('/analises?excluidas=true')).data).toEqual([]);
});
it('HF06: lixeira, busca e filtro continuam limitados à conta e ao agente',async()=>{
 await call(`/analises/${id}`,'DELETE');
 expect((await call('/analises?excluidas=true&agenteId=2&busca=senha')).data.map((x:any)=>x.id)).toEqual([id]);
 expect((await call('/analises?excluidas=true&agenteId=1')).data).toEqual([]);
 expect((await call('/analises?excluidas=true','GET',undefined,b)).data).toEqual([]);
 await call(`/analises/${id}/restaurar`,'POST',{});
});
it('HF07: rejeita identificadores inválidos e pesquisas em andamento',async()=>{
 expect((await call('/analises/abc','DELETE')).status).toBe(400);
 expect((await call('/analises/999999','DELETE')).status).toBe(404);
 sqliteDb.prepare("UPDATE analise SET status='PROCESSANDO' WHERE id=?").run(id);
 expect((await call(`/analises/${id}`,'DELETE')).status).toBe(409);
 expect((await call(`/analises/${id}/feedback`,'PUT',{util:true})).status).toBe(409);
 sqliteDb.prepare("UPDATE analise SET status='CONCLUIDA' WHERE id=?").run(id);
});
