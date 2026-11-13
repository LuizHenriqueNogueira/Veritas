import {IAnaliseRepository,IFeedbackRepository} from '../repositories/interfaces.js';
export class HistoryService {
  constructor(private analyses:IAnaliseRepository,private feedback:IFeedbackRepository){}
  private async own(id:number,user:number,includeDeleted=false){
    if(!Number.isSafeInteger(id) || id<=0)throw Object.assign(new Error('Identificador da pesquisa inválido.'),{statusCode:400});
    const a=await this.analyses.findById(id);
    if(!a || a.usuario_id!==user || (!includeDeleted && a.excluida_em))throw Object.assign(new Error('Pesquisa não encontrada nesta conta.'),{statusCode:404});
    return a;
  }
  async exclude(id:number,user:number){const a=await this.own(id,user,true);if(a.status==='PROCESSANDO')throw Object.assign(new Error('Cancele ou aguarde a análise antes de excluir.'),{statusCode:409});await this.analyses.setExcluded(id,user,new Date().toISOString());return {mensagem:'Pesquisa movida para a lixeira. Você pode restaurá-la.'};}
  async restore(id:number,user:number){await this.own(id,user,true);await this.analyses.setExcluded(id,user,null);return {mensagem:'Pesquisa restaurada no histórico.'};}
  async getFeedback(id:number,user:number){await this.own(id,user);return this.feedback.find(id,user);}
  async saveFeedback(id:number,user:number,util:unknown,comment:unknown){
    const a=await this.own(id,user);
    if(a.status!=='CONCLUIDA')throw Object.assign(new Error('O feedback fica disponível depois de concluir a análise.'),{statusCode:409});
    if(typeof util!=='boolean')throw new Error('Informe se a análise ajudou: Sim ou Não.');
    if(comment!==undefined && typeof comment!=='string')throw new Error('O comentário deve ser um texto.');
    const text=typeof comment==='string'?comment.trim():'';
    if(text.length>1000)throw new Error('O comentário deve ter no máximo 1.000 caracteres.');
    if(!util && text.length<5)throw new Error('Conte o que faltou na análise, com pelo menos 5 caracteres.');
    return this.feedback.save(id,user,util,text);
  }
}
