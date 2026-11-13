import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { configuracaoIA, integerEnv } from './config.js';
const { DatabaseSync } = createRequire(__filename)('node:sqlite') as typeof import('node:sqlite');
const DAY = 24 * 60 * 60 * 1000;
export function budgetLimits() {
  // Tetos inferiores à tabela Free consultada em 17/10/2026. .env só pode reduzi-los.
  return { requestsDay: configuracaoIA().dailyRequestLimit, requestsMinute:10,
    tokensDay:Math.min(integerEnv('AI_DAILY_TOKEN_LIMIT',40000,1,10000000),40000),
    tokensMinute:Math.min(integerEnv('AI_MINUTE_TOKEN_LIMIT',7200,1,10000000),7200) };
}
function duration(value:string|null,fallback:number) {
  if(!value)return fallback;
  if(/^\d+(\.\d+)?$/.test(value))return Math.ceil(Number(value)*1000);
  const parts=[...value.matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h|d)/g)];
  if(!parts.length || parts.map(p=>p[0]).join('')!==value)return fallback;
  return Math.ceil(parts.reduce((n,p)=>n+Number(p[1])*({ms:1,s:1000,m:60000,h:3600000,d:DAY}[p[2]]!),0));
}
export class UsageBudget {
  private db?:InstanceType<typeof DatabaseSync>;
  constructor(private filename?:string,private now=()=>Date.now()){}
  private connection(){
    if(this.db)return this.db;
    const filename=this.filename || process.env.AI_USAGE_DB_PATH || path.resolve(process.env.DATA_DIR || './data','ai-usage.db');
    if(filename!==':memory:')mkdirSync(path.dirname(path.resolve(filename)),{recursive:true});
    const db=new DatabaseSync(filename);
    try{db.exec(`PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS usage_entry(id INTEGER PRIMARY KEY,at INTEGER NOT NULL,tokens INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS usage_at ON usage_entry(at);
      CREATE TABLE IF NOT EXISTS quota(id INTEGER PRIMARY KEY CHECK(id=1),blocked_until INTEGER NOT NULL DEFAULT 0,
        request_remaining INTEGER,request_reset INTEGER,token_remaining INTEGER,token_reset INTEGER);
      INSERT OR IGNORE INTO quota(id) VALUES(1);`);}catch(error){db.close();throw error;}
    this.db=db;return db;
  }
  private totals(){
    const now=this.now();
    return this.connection().prepare(`SELECT COUNT(*) AS requests,COALESCE(SUM(tokens),0) AS tokens,
      COALESCE(SUM(CASE WHEN at>? THEN 1 ELSE 0 END),0) AS minuteRequests,
      COALESCE(SUM(CASE WHEN at>? THEN tokens ELSE 0 END),0) AS minuteTokens,
      COALESCE(MAX(at),0) AS lastAt FROM usage_entry WHERE at>?`).get(now-60000,now-60000,now-DAY) as any;
  }
  status(){
    const t=this.totals(),q=this.connection().prepare('SELECT * FROM quota WHERE id=1').get() as any;
    return {requestsToday:t.requests,tokensToday:t.tokens,minuteTokens:t.minuteTokens,
      limitResets:'janela móvel de 24 horas',...budgetLimits(),blockedUntil:q.blocked_until>this.now()?new Date(q.blocked_until).toISOString():null,
      persistent:true,accountPlanVerified:false};
  }
  reserve(tokens:number):number {
    const db=this.connection(),now=this.now(),limits=budgetLimits();db.exec('BEGIN IMMEDIATE');
    try{
      const t=this.totals(),q=db.prepare('SELECT * FROM quota WHERE id=1').get() as any;
      if(!Number.isSafeInteger(tokens) || tokens<=0)throw new Error('Estimativa de tokens inválida; chamada bloqueada.');
      if(t.lastAt>now)throw new Error('Relógio retrocedeu. Corrija a data antes de usar a IA.');
      if(q.blocked_until>now)throw new Error(`IA bloqueada pela proteção de quota até ${new Date(q.blocked_until).toLocaleString('pt-BR')}.`);
      if(t.requests>=limits.requestsDay)throw new Error('Limite diário local de chamadas de IA atingido. Aguarde a janela móvel de 24 horas.');
      if(t.tokens+tokens>limits.tokensDay)throw new Error('Limite de tokens nas últimas 24 horas atingido. A requisição não foi enviada.');
      if(tokens>limits.tokensMinute)throw new Error('Texto e resposta reservada excedem o orçamento por minuto. Reduza o texto antes de analisar.');
      if(t.minuteRequests>=limits.requestsMinute || t.minuteTokens+tokens>limits.tokensMinute)throw new Error('Orçamento por minuto reservado. Aguarde 60 segundos antes de outra análise.');
      if(t.requests && now-t.lastAt<integerEnv('AI_MIN_INTERVAL_MS',2200,0,60000))throw new Error('Aguarde alguns segundos antes de iniciar outra chamada de IA.');
      if(q.request_reset>now && q.request_remaining!==null && q.request_remaining<1 || q.token_reset>now && q.token_remaining!==null && q.token_remaining<tokens)
        throw new Error('Quota restante informada pela Groq insuficiente. Aguarde a renovação antes de analisar.');
      const info=db.prepare('INSERT INTO usage_entry(at,tokens) VALUES(?,?)').run(now,tokens);
      db.prepare('UPDATE quota SET request_remaining=MAX(0,request_remaining-1),token_remaining=MAX(0,token_remaining-?) WHERE id=1').run(tokens);
      db.exec('COMMIT');return Number(info.lastInsertRowid);
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  settle(id:number,total:number){
    // Falha/timeout/usage ausente: reserva integral permanece, sem repetir a chamada.
    if(Number.isSafeInteger(total) && total>=0)this.connection().prepare('UPDATE usage_entry SET tokens=? WHERE id=?').run(total,id);
  }
  observe(headers:Headers,status:number){
    const db=this.connection(),now=this.now();
    const numeric=(name:string)=>{const raw=headers.get(name);return raw!==null && /^\d+$/.test(raw)?Number(raw):null;};
    const req=numeric('x-ratelimit-remaining-requests'),tokens=numeric('x-ratelimit-remaining-tokens');
    const reqReset=now+duration(headers.get('x-ratelimit-reset-requests'),DAY),tokenReset=now+duration(headers.get('x-ratelimit-reset-tokens'),60000);
    const requestLimit=numeric('x-ratelimit-limit-requests'),tokenLimit=numeric('x-ratelimit-limit-tokens');
    const unexpected=(requestLimit!==null && requestLimit>1000)||(tokenLimit!==null && tokenLimit>8000);
    const block=unexpected?now+DAY:status===429?now+Math.max(duration(headers.get('retry-after'),60000),tokenReset-now,req===0?reqReset-now:0):0;
    db.prepare(`UPDATE quota SET blocked_until=MAX(blocked_until,?),
      request_remaining=CASE WHEN ? IS NULL THEN request_remaining WHEN request_reset>? THEN MIN(COALESCE(request_remaining,?),?) ELSE ? END,
      request_reset=CASE WHEN ? IS NULL THEN request_reset ELSE MAX(COALESCE(request_reset,0),?) END,
      token_remaining=CASE WHEN ? IS NULL THEN token_remaining WHEN token_reset>? THEN MIN(COALESCE(token_remaining,?),?) ELSE ? END,
      token_reset=CASE WHEN ? IS NULL THEN token_reset ELSE MAX(COALESCE(token_reset,0),?) END WHERE id=1`)
      .run(block,req,now,req,req,req,req,reqReset,tokens,now,tokens,tokens,tokens,tokens,tokenReset);
    if(unexpected)throw new Error('A quota recebida difere do perfil Free previsto. IA bloqueada por 24 horas; confira o plano da organização na Groq.');
  }
  close(){this.db?.close();this.db=undefined;}
}
