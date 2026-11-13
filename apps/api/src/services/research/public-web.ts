import {lookup} from 'node:dns/promises';
import {request} from 'node:https';
import ipaddr from 'ipaddr.js';
export function isPublicAddress(address:string){
  try{return ipaddr.process(address.replace(/^\[|\]$/g,'')).range()==='unicast';}catch{return false;}
}
export function validatePublicUrl(value:string,excludedHost?:string){
  const u=new URL(value),host=u.hostname.replace(/^\[|\]$/g,'').toLowerCase();
  if(u.protocol!=='https:' || u.username || u.password || u.port && u.port!=='443' || !host || /(^|\.)(localhost|local|internal|test|invalid)$/.test(host))throw new Error('Endereço não permitido para leitura pública.');
  if(excludedHost && (host===excludedHost || host.endsWith('.'+excludedHost)))throw new Error('O domínio do link suspeito não é aberto.');
  if(ipaddr.isValid(host) && !isPublicAddress(host))throw new Error('Endereço interno ou reservado bloqueado.');
  return u;
}
export interface PublicPage{url:string;body:string;status:number;contentType:string;}
export class PublicWeb {
  private robots=new Map<string,{at:number;body:string}>();
  constructor(private resolveHost:typeof lookup=lookup,private transport:typeof request=request){}
  async get(value:string,options:{excludedHost?:string;maxBytes?:number;timeoutMs?:number;redirects?:number}={}):Promise<PublicPage>{
    const signal=AbortSignal.timeout(options.timeoutMs || 8000),limit=options.maxBytes || 1200000;
    let current=value;
    for(let hop=0;hop<=(options.redirects ?? 2);hop++){
      const u=validatePublicUrl(current,options.excludedHost);
      const addresses=await Promise.race([this.resolveHost(u.hostname.replace(/^\[|\]$/g,''),{all:true}),new Promise<never>((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('Tempo de leitura esgotado.')),{once:true}))]);
      if(signal.aborted)throw new Error('Tempo de leitura esgotado.');
      if(!addresses.length || addresses.some(x=>!isPublicAddress(x.address)))throw new Error('DNS interno ou reservado bloqueado.');
      const selected=addresses.find(a=>a.family===4) || addresses[0];
      const result=await new Promise<PublicPage & {location?:string}>((resolve,reject)=>{
        const req=this.transport(u,{method:'GET',agent:false,signal,family:selected.family,
          // O socket usa o IP verificado, sem uma segunda resolução de DNS.
          lookup:((_host:any,_opts:any,callback:any)=>callback(null,selected.address,selected.family)) as any,
          headers:{'User-Agent':'VeritasAcademic/1.3','Accept':'text/html,application/xhtml+xml,application/xml,text/plain;q=0.8','Accept-Encoding':'identity'}},res=>{
          if(res.statusCode && [301,302,303,307,308].includes(res.statusCode)){res.resume();resolve({url:u.href,body:'',status:res.statusCode,contentType:'',location:res.headers.location});return;}
          if(Number(res.headers['content-length'] || 0)>limit){res.destroy();reject(new Error('Página excede o limite de leitura.'));return;}
          const chunks:Buffer[]=[];let bytes=0;
          res.on('data',(data:Buffer)=>{bytes+=data.length;if(bytes>limit){res.destroy(new Error('Página excede o limite de leitura.'));return;}chunks.push(data);});
          res.on('error',reject);res.on('end',()=>resolve({url:u.href,body:Buffer.concat(chunks).toString('utf8'),status:res.statusCode || 0,contentType:String(res.headers['content-type'] || '')}));
        });req.on('error',reject);req.end();
      });
      if(result.location){current=new URL(result.location,u).href;continue;}
      return result;
    }
    throw new Error('Limite de redirecionamentos atingido.');
  }
  async article(value:string,excludedHost?:string){
    const u=validatePublicUrl(value,excludedHost);let robots=this.robots.get(u.origin);
    if(!robots || Date.now()-robots.at>3600000){
      const response=await this.get(u.origin+'/robots.txt',{excludedHost,maxBytes:100000,timeoutMs:6000,redirects:1});
      if(response.status===401 || response.status===403)throw new Error('Leitura bloqueada pelo portal.');
      if(response.status>=500)throw new Error('Não foi possível consultar as regras de leitura do portal.');
      robots={at:Date.now(),body:response.status===200?response.body:''};this.robots.set(u.origin,robots);
      if(this.robots.size>200)this.robots.delete(this.robots.keys().next().value!);
    }
    if(!robotsAllowed(robots.body,u.pathname+u.search))throw new Error('Leitura bloqueada pelo robots.txt do portal.');
    const page=await this.get(value,{excludedHost});
    if(page.status!==200)throw new Error(`Página indisponível (HTTP ${page.status}).`);
    if(!/text\/html|application\/xhtml\+xml/i.test(page.contentType))throw new Error('O resultado não é uma página HTML legível.');
    return page;
  }
}
export function robotsAllowed(body:string,path:string){
  const groups:Array<{agents:string[];rules:Array<{allow:boolean;path:string}>}>=[];let group:typeof groups[number]|null=null,hadRule=false;
  for(const line of body.split(/\r?\n/)){
    const match=line.replace(/#.*/,'').match(/^\s*([^:]+):\s*(.*)$/);if(!match)continue;
    const name=match[1].trim().toLowerCase(),value=match[2].trim();
    if(name==='user-agent'){
      if(!group || hadRule){group={agents:[],rules:[]};groups.push(group);hadRule=false;}
      group.agents.push(value.toLowerCase());
    }else if(group && ['allow','disallow'].includes(name)){hadRule=true;if(value)group.rules.push({allow:name==='allow',path:value});}
  }
  const score=(agents:string[])=>Math.max(...agents.map(a=>a==='*'?1:a && 'veritasacademic'.startsWith(a)?a.length+1:0),0);
  const best=Math.max(...groups.map(g=>score(g.agents)),0);if(!best)return true;
  const matches=groups.filter(g=>score(g.agents)===best).flatMap(g=>g.rules).filter(r=>{
    const pattern=r.path.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\\\$$/,'$');
    try{return new RegExp('^'+pattern).test(path);}catch{return false;}
  }).sort((a,b)=>b.path.length-a.path.length || Number(b.allow)-Number(a.allow));
  return !matches.length || matches[0].allow;
}
