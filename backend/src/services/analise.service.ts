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
import { GeminiService } from './ai/gemini.service.js';
import { isValidUrl } from '../utils/url-validator.js';

export class AnaliseService {
  private desinformacaoAgent = new DesinformacaoAgent();
  private fraudeDigitalAgent = new FraudeDigitalAgent();
  private linkSuspeitoAgent = new LinkSuspeitoAgent();
  private geminiService = new GeminiService();

  constructor(
    private analiseRepo: IAnaliseRepository,
    private agenteRepo: IAgenteRepository,
    private fonteRepo: IFonteRepository,
    private achadoRepo: IAchadoRepository
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

    // RN25 / RN26: Registra a análise no banco associada ao usuário com status inicial PROCESSANDO
    const novaAnalise = await this.analiseRepo.create({
      usuario_id: usuarioId,
      agente_id: agente.id,
      tipo_entrada: dto.tipo_entrada,
      conteudo: dto.tipo_entrada !== 'URL' ? conteudoParaAnalisar : null,
      url: dto.tipo_entrada === 'URL' || agente.tipo === 'link_suspeito' ? conteudoParaAnalisar : null,
      status: 'PROCESSANDO' as StatusAnalise,
      classificacao: null,
      resultado: null,
      data_conclusao: null
    });

    let resultadoAgente: ResultadoAgente;

    try {
      // Tenta análise com IA Generativa (Google Gemini) se a API Key estiver presente
      const resultadoIA = await this.geminiService.analisarComIA(agente.tipo, conteudoParaAnalisar);

      if (resultadoIA) {
        resultadoAgente = resultadoIA;
      } else {
        // RN08: Cada análise deverá ser executada de acordo com o agente selecionado (Motor Heurístico Fallback)
        switch (agente.tipo) {
          case 'desinformacao':
            resultadoAgente = await this.desinformacaoAgent.analisar(conteudoParaAnalisar);
            break;
          case 'fraude_digital':
            resultadoAgente = await this.fraudeDigitalAgent.analisar(conteudoParaAnalisar);
            break;
          case 'link_suspeito':
            resultadoAgente = await this.linkSuspeitoAgent.analisar(conteudoParaAnalisar);
            break;
          default:
            throw new Error(`Agente ${agente.tipo} não possui implementação de análise.`);
        }
      }

      // Persiste achados e fontes no banco
      const fontesSalvas = [];
      for (const f of resultadoAgente.fontes) {
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
        const achado = await this.achadoRepo.create({
          analise_id: novaAnalise.id,
          categoria: a.categoria,
          descricao: a.descricao,
          nivel_relevancia: a.nivel_relevancia
        });
        achadosSalvos.push(achado);
      }

      // Atualiza o status da análise para CONCLUIDA
      const analiseFinalizada = await this.analiseRepo.updateStatus(
        novaAnalise.id,
        'CONCLUIDA',
        resultadoAgente.classificacao,
        resultadoAgente.resultado,
        new Date()
      );

      return {
        ...(analiseFinalizada || novaAnalise),
        status: 'CONCLUIDA',
        classificacao: resultadoAgente.classificacao,
        resultado: resultadoAgente.resultado,
        agente,
        fontes: fontesSalvas,
        achados: achadosSalvos
      };
    } catch (err: any) {
      // RN24: Caso uma análise não possa ser concluída, o sistema deverá informar a falha ou limitação ao usuário.
      await this.analiseRepo.updateStatus(
        novaAnalise.id,
        'ERRO',
        'Falha no processamento',
        err.message || 'Erro inesperado durante a execução do agente.'
      );

      throw new Error(`Falha na análise: ${err.message || 'Ocorreu um erro no processamento do agente.'}`);
    }
  }

  /**
   * Consulta o histórico de análises do usuário logado.
   * Atende a RN03, RN04, RN26 e HU16.
   */
  async listarAnalisesDoUsuario(
    usuarioId: number,
    options?: { agenteId?: number; busca?: string }
  ): Promise<Analise[]> {
    return this.analiseRepo.findByUsuarioId(usuarioId, options);
  }

  /**
   * Recupera os detalhes completos de uma análise pelo seu ID, garantindo autorização de acesso.
   * RN04: Cada usuário deverá acessar somente as análises pertencentes à sua própria conta.
   */
  async obterDetalhesAnalise(analiseId: number, usuarioId: number): Promise<AnaliseCompletaDTO> {
    const analise = await this.analiseRepo.findById(analiseId);
    if (!analise) {
      throw new Error('Análise não encontrada.');
    }

    // RN04: Restrição estrita por conta de usuário
    if (analise.usuario_id !== usuarioId) {
      throw new Error('Acesso negado: Você não possui permissão para visualizar esta análise.');
    }

    const agente = await this.agenteRepo.findById(analise.agente_id);
    const fontes = await this.fonteRepo.findByAnaliseId(analise.id);
    const achados = await this.achadoRepo.findByAnaliseId(analise.id);

    return {
      ...analise,
      agente: agente || undefined,
      fontes,
      achados
    };
  }
}
