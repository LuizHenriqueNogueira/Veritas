import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,renameSync,statSync} from 'node:fs';
import path from 'node:path';
import {readLimited} from '../network.js';
import type {ConsultaFonte} from './reputation.service.js';

export const PHISHING_DATABASE_FEED='https://raw.githubusercontent.com/Phishing-Database/Phishing.Database/master/phishing-links-ACTIVE.txt';
export const PHISHING_DATABASE_INFO='https://github.com/Phishing-Database/Phishing.Database';
const TTL=12*60*60*1000;
export function urlHash(value:string){const u=new URL(value);if(!['http:','https:'].includes(u.protocol))throw new Error('Protocolo inválido.');u.hash='';return createHash('sha256').update(u.href).digest('hex');}
export class UrlFeed {
  private hashes=new Set<string>();private fetchedAt=0;private loaded=false;private pending:Promise<boolean>|null=null;private retryAfter=0;
  constructor(private request:typeof fetch,private file:string,private now=()=>Date.now()){}
  private load(){
    if(this.loaded)return;this.loaded=true;
    try{if(statSync(this.file).size>128*1024*1024)return;const s=JSON.parse(readFileSync(this.file,'utf8'));
      if(s.version!==1 || !Number.isFinite(s.fetchedAt) || s.fetchedAt>this.now()+300000 || s.fetchedAt<=0 || !Array.isArray(s.hashes) || s.hashes.length>1500000 || !s.hashes.length || s.hashes.some((x:unknown)=>typeof x!=='string'|| !/^[a-f0-9]{64}$/.test(x)))return;
      this.hashes=new Set(s.hashes);this.fetchedAt=s.fetchedAt;
    }catch{}
  }
  status(){this.load();return {loaded:!!this.fetchedAt,entries:this.hashes.size,updatedAt:this.fetchedAt?new Date(this.fetchedAt).toISOString():null,stale:!!this.fetchedAt && this.now()-this.fetchedAt>=TTL};}
  async refresh(){
    this.load();if(this.fetchedAt && this.now()-this.fetchedAt<TTL)return true;
    if(this.pending)return this.pending;if(this.now()<this.retryAfter)return false;
    this.pending=this.download();try{return await this.pending;}finally{this.pending=null;}
  }
  private async download(){
    try{
      const r=await this.request(PHISHING_DATABASE_FEED,{signal:AbortSignal.timeout(60000),redirect:'error',headers:{Accept:'text/plain'}});
      if(!r.ok){await r.body?.cancel();throw new Error('Feed indisponível.');}
      const text=await readLimited(r,96*1024*1024),hashes=new Set<string>();
      if(/^\s*<(?:html|!doctype)/i.test(text))throw new Error('Feed inválido.');
      let invalid=0;
      for(const line of text.split(/\r?\n/)){
        const raw=line.trim();if(!raw || raw.startsWith('#'))continue;
        try{hashes.add(urlHash(raw));}catch{invalid++;}
        if(hashes.size>1500000)throw new Error('Base excede o limite.');
      }
      if(!hashes.size || invalid>hashes.size*.05)throw new Error('Base vazia ou formato inválido.');
      this.hashes=hashes;this.fetchedAt=this.now();
      mkdirSync(path.dirname(this.file),{recursive:true});const tmp=this.file+'.tmp';writeFileSync(tmp,JSON.stringify({version:1,fetchedAt:this.fetchedAt,hashes:[...hashes]}));renameSync(tmp,this.file);
      return true;
    }catch{this.retryAfter=this.now()+60000;return false;}
  }
  async consult(url:string,consultadoEm:string):Promise<ConsultaFonte>{
    if(process.env.PHISHING_DATABASE_ENABLED==='false')return {fonte:'Phishing.Database',estado:'DESATIVADO',consultadoEm,detalhe:'Fonte opcional desativada.'};
    await this.refresh();const s=this.status(),found=this.hashes.has(urlHash(url));
    return {fonte:'Phishing.Database',estado:found?'LISTADO':!s.loaded?'INDISPONIVEL':s.stale?'DESATUALIZADO':'NAO_LISTADO',consultadoEm,
      ...(s.updatedAt?{atualizadoEm:s.updatedAt,desatualizado:s.stale}:{}),
      detalhe:found?'A URL exata consta na cópia da Phishing.Database. O registro é um indício de phishing e pode precisar de revisão.':!s.loaded?'Não foi possível obter uma cópia válida desta fonte.':s.stale?'Cópia vencida; não permite concluir ausência de registros atuais.':'A URL exata não foi encontrada nesta fonte. Isso não comprova segurança.'};
  }
}
