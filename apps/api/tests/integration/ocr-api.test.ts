import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import app from '../../src/app.js';
let server: Server; let base: string; let token: string;
async function call(path: string, body?: unknown, auth=token) {
 const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:response.status,data:await response.json() as any};
}
const image=(name:string)=>'data:image/png;base64,'+readFileSync(new URL('../fixtures/'+name, import.meta.url)).toString('base64');
beforeAll(async()=>{
 server=app.listen(0,'127.0.0.1'); await new Promise<void>(r=>server.on('listening',r));
 base=`http://127.0.0.1:${(server.address() as any).port}/api`;
 token=(await call('/auth/register',{nome:'Teste OCR',email:'ocr@example.test',senha:'SenhaTeste123'})).data.token;
});
afterAll(async()=>{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));});
describe('OCR real e API integrada',()=>{
 it('TI01: exige autenticação para OCR',async()=>{expect((await call('/ocr/reconhecer',{imagem_ou_texto:image('texto-pt.png')},'')).status).toBe(401);});
 it('TI02: aceita dimensões reais sem estado global de captura anterior',async()=>{expect((await call('/ocr/capturar-regiao',{x:0,y:0,largura:1600,altura:360})).status).toBe(200);});
 it('TI03: reconhece português em PNG usando Tesseract real',async()=>{const r=await call('/ocr/reconhecer',{imagem_ou_texto:image('texto-pt.png')});expect(r.status).toBe(200);expect(r.data.texto.toLowerCase()).toContain('veritas');expect(r.data.texto.toLowerCase()).toContain('informações');expect(r.data.imagemDescartada).toBe(true);},60000);
 it('TI04: imagem branca retorna SEM_TEXTO e nova tentativa funciona',async()=>{const r=await call('/ocr/reconhecer',{imagem_ou_texto:image('sem-texto.png')});expect(r.status).toBe(422);expect(r.data.codigo).toBe('SEM_TEXTO');expect((await call('/ocr/reconhecer',{imagem_ou_texto:image('texto-pt.png')})).status).toBe(200);},60000);
 it('TI05: texto revisado passa pelo agente e aparece no histórico',async()=>{const r=await call('/analises',{tipo_entrada:'CAPTURA_OCR',agente_tipo:'fraude_digital',conteudo:'Sua conta será bloqueada. Digite sua senha e informe seu token.'});expect(r.status).toBe(201);expect(r.data.status).toBe('CONCLUIDA');expect(r.data.resultado).toContain('regras locais');expect(r.data.resultado).not.toContain('Motor:');expect((await call('/analises')).data.some((a:any)=>a.id===r.data.id)).toBe(true);});
 it('TI06: outro usuário não acessa detalhes nem histórico alheio',async()=>{const a=(await call('/analises')).data[0];const other=(await call('/auth/register',{nome:'Outro Usuário',email:'outro@example.test',senha:'SenhaTeste123'})).data.token;expect((await call('/analises/'+a.id,undefined,other)).status).toBeGreaterThanOrEqual(400);expect((await call('/analises',undefined,other)).data).toEqual([]);});
 it('TI07: bloqueia leitura de endereço privado sem iniciar IA',async()=>{const r=await call('/analises',{tipo_entrada:'URL',agente_tipo:'desinformacao',url:'https://127.0.0.1/'});expect(r.status).toBe(400);expect(r.data.erro).toContain('Nenhuma análise de IA foi iniciada');});
});
