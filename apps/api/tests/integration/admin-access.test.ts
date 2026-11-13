import {beforeAll,afterAll,it,expect} from 'vitest';
import type {Server} from 'node:http';
import app from '../../src/app.js';
let server:Server,base:string,admin:any,user:any;
const oldId=process.env.ADMIN_USER_ID,oldEmail=process.env.ADMIN_EMAIL;
async function call(route:string,token?:string,body?:any){const r=await fetch(base+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json() as any};}
beforeAll(async()=>{delete process.env.ADMIN_USER_ID;delete process.env.ADMIN_EMAIL;server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.on('listening',r));base=`http://127.0.0.1:${(server.address() as any).port}/api`;admin=(await call('/auth/register',undefined,{nome:'Administrador Teste',email:'admin@test.invalid',senha:'SenhaTeste123'})).data;user=(await call('/auth/register',undefined,{nome:'Usuário Teste',email:'user@test.invalid',senha:'SenhaTeste123',perfil:'ADMIN'})).data;process.env.ADMIN_USER_ID=String(admin.usuario.id);process.env.ADMIN_EMAIL=admin.usuario.email;});
afterAll(async()=>{if(oldId===undefined)delete process.env.ADMIN_USER_ID;else process.env.ADMIN_USER_ID=oldId;if(oldEmail===undefined)delete process.env.ADMIN_EMAIL;else process.env.ADMIN_EMAIL=oldEmail;server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));});
it('TA01: cadastro público ignora tentativa de escolher perfil administrativo',()=>{expect(user.usuario.perfil).toBe('USUARIO');});
it('TA02: usuário comum recebe 403 ao consultar tokens e configuração',async()=>{const r=await call('/agentes/configuracao',user.token);expect(r.status).toBe(403);expect(r.data.usage).toBeUndefined();});
it('TA03: usuário comum não pode atualizar a base administrativa',async()=>{expect((await call('/agentes/reputacao/atualizar',user.token,{})).status).toBe(403);});
it('TA04: administrador vinculado à conta existente consulta painel',async()=>{const r=await call('/agentes/configuracao',admin.token);expect(r.status).toBe(200);expect(r.data.usage.persistent).toBe(true);});
it('TA05: sessão informa perfil atualizado sem confiar em papel vindo do cliente',async()=>{expect((await call('/auth/me',admin.token)).data.perfil).toBe('ADMIN');expect((await call('/auth/me',user.token)).data.perfil).toBe('USUARIO');});
it('TA06: identificador e e-mail precisam coincidir e revogação vale para token já emitido',async()=>{process.env.ADMIN_EMAIL='diferente@test.invalid';expect((await call('/agentes/configuracao',admin.token)).status).toBe(403);process.env.ADMIN_EMAIL=admin.usuario.email;});
it('TA07: falta de autenticação bloqueia painel antes da autorização',async()=>{expect((await call('/agentes/configuracao')).status).toBe(401);});
