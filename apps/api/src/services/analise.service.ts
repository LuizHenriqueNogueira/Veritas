// ========================================================
// Analisador IA - Veritas
// Serviço Gerenciador de Análises (Diagrama de Pacotes Seção 2.2.3)
// Atende a RN04, RN05, RN06, RN07, RN08, RN09, RN16, RN17, RN18, RN19, RN20, RN24, RN25, RN26, RN27, RN28
// ========================================================

import {
  IAnaliseRepository,
  IAgenteRepository,
  IFonteRepository,
  IAchadoRepository
} from '../repositories/interfaces.js';
import {
  SolicitacaoAnaliseDTO,
  AnaliseCompletaDTO,
  Analise,
  StatusAnalise,
  ResultadoAgente
} from '../models/index.js';
import { DesinformacaoAgent } from './agents/desinformacao.agent.js';
import { FraudeDigitalAgent } from './agents/fraude-digital.agent.js';
import { LinkSuspeitoAgent } from './agents/link-suspeito.agent.js';
import { aiService, AIService, configuracaoIA } from './ai/ai.service.js';
import { reputationService, ReputationService, aplicarReputacao } from './reputation/reputation.service.js';
import { factCheckService, FactCheckService, aplicarChecagens } from './factcheck/factcheck.service.js';
import { isValidUrl } from '../utils/url-validator.js';
import {apresentarAnalise} from './presentation.service.js';
import {traducaoLegada} from './verdict.service.js';
import {analysisJobs,checkJob,cancellable,AnalysisCancelled} from './analysis-jobs.js';

export class AnaliseService {
  private desinformacaoAgent = new DesinformacaoAgent();
  private fraudeDigitalAgent = new FraudeDigitalAgent();
  private linkSuspeitoAgent = new LinkSuspeitoAgent();

  constructor(
    private analiseRepo: IAnaliseRepository,
    private agenteRepo: IAgenteRepository,
    private fonteRepo: IFonteRepository,
    private achadoRepo: IAchadoRepository,
    private ai: Pick<AIService, 'analisar'> = aiService,
    private reputation: Pick<ReputationService, 'consultar'> = reputationService,
    private factcheck: Pick<FactCheckService,'consultar'> = factCheckService
  ) {}

  /**
   * Valida e executa uma nova análise solicitada pelo usuário autenticado.
   * Garante o cumprimento de todas as regras de negócio de entrada e execução.
   */
  async criarEExecutarAnalise(usuarioId: number, dto: SolicitacaoAnaliseDTO): Promise<AnaliseCompletaDTO> {
    // RN28: O usuário deverá possuir controle sobre o início da análise.
    // RN05: O sistema somente deverá iniciar uma análise quando o usuário fornecer um texto, uma URL válida ou um texto obtido por captura e selecionar um agente compatível.
    if (!dto.tipo_entrada || !['TEXTO', 'CAPTURA_OCR', 'URL'].includes(dto.tipo_entrada)) {
      throw new Error('Tipo de entrada inválido. Deve ser TEXTO, CAPTURA_OCR ou URL.');
    }

    // RN06: O usuário deverá selecionar o agente antes de iniciar a análise.
    let agente = null;
    if (dto.agente_id) {
      agente = await this.agenteRepo.findById(dto.agente_id);
    } else if (dto.agente_tipo) {
      agente = await this.agenteRepo.findByTipo(dto.agente_tipo);
    }

    if (!agente || !agente.ativo) {
      throw new Error('Selecione um agente de verificação válido e ativo antes de iniciar a análise.');
    }

    // Validações de conteúdo de acordo com o tipo de entrada
    let conteudoParaAnalisar = '';

    if (dto.tipo_entrada === 'URL') {
      if (!dto.url || !isValidUrl(dto.url)) {
        // RN16: Quando um link for fornecido, o sistema deverá verificar se a URL possui formato válido antes de iniciar a análise.
        throw new Error('A URL fornecida não possui um formato válido.');
      }
      conteudoParaAnalisar = dto.url.trim();
      if (agente.tipo !== 'link_suspeito') throw new Error('Para analisar o conteúdo de uma página, cole seu texto ou use a captura OCR. A análise de URL está disponível no agente Link Suspeito.');
    } else {
      if (!dto.conteudo || dto.conteudo.trim().length === 0) {
        throw new Error('O conteúdo textual para análise não pode estar vazio.');
      }
      conteudoParaAnalisar = dto.conteudo.trim();
    }

    // RN09: O Agente de Link Suspeito deverá receber uma URL válida para realizar a análise.
    if (agente.tipo === 'link_suspeito') {
      const urlAlvo = dto.tipo_entrada === 'URL' ? dto.url : dto.conteudo;
      if (!urlAlvo || !isValidUrl(urlAlvo)) {
        throw new Error('O Agente de Link Suspeito exige que o conteúdo informado seja uma URL válida.');
      }
      conteudoParaAnalisar = urlAlvo.trim();
    }

    if (conteudoParaAnalisar.length > 10000) throw new Error('O conteúdo deve ter até 10.000 caracteres.');

    if(dto.termos_busca!==undefined && (typeof dto.termos_busca!=='string' || dto.termos_busca.length>100))throw new Error('Termos de busca devem ser um texto de até 100 caracteres.');
    if(dto.contexto!==undefined && (typeof dto.contexto!=='string' || dto.contexto.length>2000))throw new Error('O contexto deve ter no máximo 2.000 caracteres.');
    if(dto.contexto?.trim() && agente.tipo!=='link_suspeito')throw new Error('O contexto complementar está disponível na análise de links.');
    const contexto=dto.contexto?.trim() || '';
    const job=analysisJobs.start(usuarioId,dto.solicitacao_id);
    if(job.controller.signal.aborted){analysisJobs.finish(job,'CANCELADA');throw new AnalysisCancelled();}

    // RN25 / RN26: Registra a análise no banco associada ao usuário com status inicial PROCESSANDO
    const novaAnalise = await this.analiseRepo.create({
      usuario_id: usuarioId,
      agente_id: agente.id,
      tipo_entrada: dto.tipo_entrada,
      conteudo: dto.tipo_entrada !== 'URL' ? conteudoParaAnalisar : null,
      url: dto.tipo_entrada === 'URL' || agente.tipo === 'link_suspeito' ? conteudoParaAnalisar : null,
      contexto:contexto || null,
      status: 'PROCESSANDO' as StatusAnalise,
      classificacao: null,
      resultado: null,
      data_conclusao: null
    }).catch(error=>{analysisJobs.finish(job,'ERRO');throw error;});
    job.analysisId=novaAnalise.id;

    let resultadoAgente: ResultadoAgente;

    try {
      checkJob(job.controller.signal);
      const c = configuracaoIA();
      const scope = String(usuarioId);
      const pesquisa = await cancellable(contexto?this.factcheck.consultar(conteudoParaAnalisar,dto.termos_busca,agente.tipo,scope,contexto):this.factcheck.consultar(conteudoParaAnalisar,dto.termos_busca,agente.tipo,scope),job.controller.signal);
      checkJob(job.controller.signal);
      let resultadoIA: ResultadoAgente | null = null;
      let erroIA = '';
      if (agente.tipo !== 'link_suspeito' || c.linkUsesAI) {
        try { resultadoIA = await cancellable(this.ai.analisar(agente.tipo,contexto?JSON.stringify({url:conteudoParaAnalisar,contexto_da_mensagem:contexto}):conteudoParaAnalisar,pesquisa,scope),job.controller.signal); }
        catch (err) {
          if(err instanceof AnalysisCancelled)throw err;
          erroIA = (err as Error).message;
        }
      }
      const local = agente.tipo === 'link_suspeito'
        ? await this.linkSuspeitoAgent.analisar(conteudoParaAnalisar)
        : agente.tipo === 'desinformacao'
          ? await this.desinformacaoAgent.analisar(conteudoParaAnalisar)
          : await this.fraudeDigitalAgent.analisar(conteudoParaAnalisar);
      checkJob(job.controller.signal);
      resultadoAgente = resultadoIA || local;
      if (!resultadoIA) resultadoAgente.fontes = resultadoAgente.fontes.map(f => ({...f, avaliacao: 'Referência sugerida para consulta manual. Não consultada automaticamente.'}));
      const limitacao = resultadoIA ? 'Parecer baseado no conteúdo informado e nos trechos de pesquisa disponíveis, com limitações registradas abaixo.' : 'A triagem por regras locais não comprova fatos.';
      resultadoAgente.resultado = `${limitacao}\n\n${resultadoAgente.resultado}`;
      if (agente.tipo === 'link_suspeito') {
        // A consulta determinística às bases nunca pode ser anulada pelo parecer do LLM.
        const rank=(label:string)=>/alto/i.test(label)?2:/médio|medio|moderado/i.test(label)?1:0;
        const contextualInconclusive=resultadoIA && /inconclusiv/i.test(resultadoIA.classificacao);
        if (resultadoIA && (rank(local.classificacao)>rank(resultadoIA.classificacao) || contextualInconclusive)) {
          resultadoAgente.classificacao = local.classificacao;
          resultadoAgente.achados.push(...local.achados);
          if(contextualInconclusive)resultadoAgente.resultado=local.resultado;
        }
        resultadoAgente = aplicarReputacao(resultadoAgente, await cancellable(this.reputation.consultar(conteudoParaAnalisar),job.controller.signal));
        resultadoAgente.resultado += '\n\nA URL suspeita não foi aberta. Redirecionamentos e conteúdo da página não foram inspecionados.';
        if (erroIA) {
          resultadoAgente.achados.push({categoria:'IA complementar indisponível',descricao:erroIA,nivel_relevancia:'MEDIO'});
          resultadoAgente.resultado += '\n\nA IA complementar falhou. O resultado usa estrutura da URL e o estado informado das bases de reputação.';
        }
      }
      if(agente.tipo!=='link_suspeito' && erroIA){resultadoAgente.achados.push({categoria:'Síntese de IA não executada',descricao:erroIA,nivel_relevancia:'MEDIO'});resultadoAgente.resultado+='\n\nIA indisponível: '+erroIA;}
      if(agente.tipo==='desinformacao' && !resultadoIA){resultadoAgente.classificacao='Inconclusivo: síntese de IA não executada';resultadoAgente.resultado+='\n\nAs fontes são mostradas para consulta; regras locais não atribuem um veredito factual.';}
      resultadoAgente=aplicarChecagens(resultadoAgente,pesquisa);
      checkJob(job.controller.signal);
      // Persiste achados e fontes no banco
      const fontesSalvas = [];
      for (const f of resultadoAgente.fontes) {
        checkJob(job.controller.signal);
        const fonte = await this.fonteRepo.create({
          analise_id: novaAnalise.id,
          titulo: f.titulo,
          url: f.url,
          dominio: f.dominio,
          avaliacao: f.avaliacao
        });
        fontesSalvas.push(fonte);
      }

      const achadosSalvos = [];
      for (const a of resultadoAgente.achados) {
        checkJob(job.controller.signal);
        const achado = await this.achadoRepo.create({
          analise_id: novaAnalise.id,
          categoria: a.categoria,
          descricao: a.descricao,
          nivel_relevancia: a.nivel_relevancia
        });
        achadosSalvos.push(achado);
      }

      // Atualiza o status da análise para CONCLUIDA
      checkJob(job.controller.signal);
      const analiseFinalizada = await this.analiseRepo.updateStatus(
        novaAnalise.id,
        'CONCLUIDA',
        resultadoAgente.classificacao,
        resultadoAgente.resultado,
        new Date()
      );
      checkJob(job.controller.signal);

      return apresentarAnalise({
        ...(analiseFinalizada || novaAnalise),
        status: 'CONCLUIDA',
        classificacao: resultadoAgente.classificacao,
        resultado: resultadoAgente.resultado,
        agente,
        fontes: fontesSalvas,
        achados: achadosSalvos
      });
    } catch (err: any) {
      if(err instanceof AnalysisCancelled){
        const stopped=await this.analiseRepo.updateStatus(novaAnalise.id,'CANCELADA','Análise cancelada','A análise foi cancelada a pedido do usuário. Chamadas externas já enviadas podem ter consumido cota.',new Date());
        return apresentarAnalise({...stopped!,agente,fontes:[],achados:[]});
      }
      // RN24: Caso uma análise não possa ser concluída, o sistema deverá informar a falha ou limitação ao usuário.
      await this.analiseRepo.updateStatus(
        novaAnalise.id,
        'ERRO',
        'Falha no processamento',
        err.message || 'Erro inesperado durante a execução do agente.'
      );

      throw new Error(`Falha na análise: ${err.message || 'Ocorreu um erro no processamento do agente.'}`);
    } finally {const state=await this.analiseRepo.findById(novaAnalise.id);analysisJobs.finish(job,state?.status || 'ERRO');}
  }

  /**
   * Consulta o histórico de análises do usuário logado.
   * Atende a RN03, RN04, RN26 e HU16.
   */
  async listarAnalisesDoUsuario(
    usuarioId: number,
    options?: { agenteId?: number; busca?: string; excluidas?:boolean }
  ): Promise<Analise[]> {
    const list=await this.analiseRepo.findByUsuarioId(usuarioId, options);
    return list.map(a=>({...a,classificacao:a.classificacao?traducaoLegada(a.classificacao):a.classificacao}));
  }

  /**
   * Recupera os detalhes completos de uma análise pelo seu ID, garantindo autorização de acesso.
   * RN04: Cada usuário deverá acessar somente as análises pertencentes à sua própria conta.
   */
  async obterDetalhesAnalise(analiseId: number, usuarioId: number): Promise<AnaliseCompletaDTO> {
    const analise = await this.analiseRepo.findById(analiseId);
    if (!analise || analise.excluida_em) {
      throw new Error('Análise não encontrada.');
    }

    // RN04: Restrição estrita por conta de usuário
    if (analise.usuario_id !== usuarioId) {
      throw Object.assign(new Error('Acesso negado: Você não possui permissão para visualizar esta análise.'),{statusCode:403});
    }

    const agente = await this.agenteRepo.findById(analise.agente_id);
    const fontes = await this.fonteRepo.findByAnaliseId(analise.id);
    const achados = await this.achadoRepo.findByAnaliseId(analise.id);

    return apresentarAnalise({
      ...analise,
      agente: agente || undefined,
      fontes,
      achados
    });
  }

  async cancelar(usuarioId:number,requestId:string){
    const state=analysisJobs.cancel(usuarioId,requestId);
    if(state.status==='CANCELADA' && state.analysisId){
      const a=await this.analiseRepo.findById(state.analysisId);
      if(a?.usuario_id===usuarioId && a.status==='PROCESSANDO')await this.analiseRepo.updateStatus(a.id,'CANCELADA','Análise cancelada','A análise foi cancelada a pedido do usuário.',new Date());
    }
    return {status:state.status,mensagem:state.status==='CONCLUIDA'?'A análise já foi concluída. Ela está disponível no histórico.':'Análise cancelada. Você pode editar os dados ou iniciar outra pesquisa.'};
  }
}
