import { describe, it, expect, beforeEach } from 'vitest';
import { AnaliseService } from '../../src/services/analise.service.js';
import {
  MemoryAnaliseRepository,
  MemoryAgenteRepository,
  MemoryFonteRepository,
  MemoryAchadoRepository
} from '../../src/repositories/memory.repository.js';

describe('AnaliseService - Testes de Unidade (TU16 - TU18)', () => {
  let analiseRepo: MemoryAnaliseRepository;
  let agenteRepo: MemoryAgenteRepository;
  let fonteRepo: MemoryFonteRepository;
  let achadoRepo: MemoryAchadoRepository;
  let analiseService: AnaliseService;

  beforeEach(() => {
    analiseRepo = new MemoryAnaliseRepository();
    agenteRepo = new MemoryAgenteRepository();
    fonteRepo = new MemoryFonteRepository();
    achadoRepo = new MemoryAchadoRepository();
    analiseService = new AnaliseService(analiseRepo, agenteRepo, fonteRepo, achadoRepo);
  });

  // TU16: Criação e execução completa do fluxo de análise
  it('TU16: Deve orquestrar a execução do agente e persistir análise, achados e fontes (RN05, RN08, RN25, RN26)', async () => {
    const usuarioId = 10;
    const solicitacao = {
      tipo_entrada: 'TEXTO' as const,
      agente_tipo: 'desinformacao' as const,
      conteudo: 'Notícia sobre descobertas científicas em tecnologia.'
    };

    const resultado = await analiseService.criarEExecutarAnalise(usuarioId, solicitacao);

    expect(resultado.id).toBeDefined();
    expect(resultado.usuario_id).toBe(usuarioId);
    expect(resultado.status).toBe('CONCLUIDA');
    expect(resultado.classificacao).toBeDefined();
    expect(resultado.resultado).toBeDefined();
    expect(resultado.fontes.length).toBeGreaterThan(0);
    expect(resultado.achados.length).toBeGreaterThan(0);

    // Validação no histórico do usuário (RN26)
    const historico = await analiseService.listarAnalisesDoUsuario(usuarioId);
    expect(historico.length).toBe(1);
    expect(historico[0].id).toBe(resultado.id);
  });

  // TU17: Isolamento estrito entre usuários no histórico e detalhes
  it('TU17: Deve barrar acesso a análises pertencentes a outro usuário (RN04)', async () => {
    const analiseUsuarioA = await analiseService.criarEExecutarAnalise(10, {
      tipo_entrada: 'TEXTO',
      agente_tipo: 'desinformacao',
      conteudo: 'Texto confidencial do usuário 10.'
    });

    // Usuário B (ID 20) tenta acessar análise do Usuário A (ID 10)
    await expect(
      analiseService.obterDetalhesAnalise(analiseUsuarioA.id, 20)
    ).rejects.toThrow('Acesso negado: Você não possui permissão para visualizar esta análise.');
  });

  // TU18: Rejeição de análise sem seleção de agente compatível
  it('TU18: Deve impedir início da análise se o agente selecionado não existir ou for nulo (RN06)', async () => {
    await expect(
      analiseService.criarEExecutarAnalise(10, {
        tipo_entrada: 'TEXTO',
        agente_id: 9999, // Agente inexistente
        conteudo: 'Texto qualquer'
      })
    ).rejects.toThrow('Selecione um agente de verificação válido e ativo');
  });
});
