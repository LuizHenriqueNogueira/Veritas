import {randomUUID} from 'node:crypto';
export class AnalysisCancelled extends Error {statusCode=409;constructor(){super('Análise cancelada.');}}
type Job={id:string;user:number;controller:AbortController;analysisId?:number};
export class AnalysisJobs {
  private active=new Map<string,Job>();
  private finished=new Map<string,{at:number;status:string;analysisId?:number}>();
  private key(user:number,id:string){return `${user}:${id}`;}
  private valid(id:string){if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))throw new Error('Identificador da solicitação inválido.');}
  start(user:number,id:string=randomUUID()){
    this.valid(id);const key=this.key(user,id);
    for(const [k,v] of this.finished)if(Date.now()-v.at>600000)this.finished.delete(k);
    if(this.active.has(key))throw new Error('Esta análise já está em andamento.');
    const job:Job={id,user,controller:new AbortController()};
    if(this.finished.get(key)?.status==='CANCELADA')job.controller.abort();
    this.active.set(key,job);return job;
  }
  cancel(user:number,id:string){
    this.valid(id);const key=this.key(user,id),job=this.active.get(key);
    if(job){job.controller.abort();return {status:'CANCELADA',analysisId:job.analysisId};}
    const finished=this.finished.get(key);if(finished)return finished;
    this.remember(key,'CANCELADA');return {status:'CANCELADA'};
  }
  private remember(key:string,status:string,analysisId?:number){this.finished.set(key,{status,analysisId,at:Date.now()});while(this.finished.size>500)this.finished.delete(this.finished.keys().next().value!);}
  finish(job:Job,status:string){this.active.delete(this.key(job.user,job.id));this.remember(this.key(job.user,job.id),status,job.analysisId);}
}
export function checkJob(signal:AbortSignal){if(signal.aborted)throw new AnalysisCancelled();}
export async function cancellable<T>(promise:Promise<T>,signal:AbortSignal):Promise<T>{
  checkJob(signal);
  return new Promise<T>((resolve,reject)=>{
    const cancel=()=>{signal.removeEventListener('abort',cancel);reject(new AnalysisCancelled());};
    signal.addEventListener('abort',cancel,{once:true});
    promise.then(v=>{signal.removeEventListener('abort',cancel);signal.aborted?reject(new AnalysisCancelled()):resolve(v);},e=>{signal.removeEventListener('abort',cancel);reject(e);});
  });
}
export const analysisJobs=new AnalysisJobs();
