import { describe, it, expect } from 'vitest';
import { DesinformacaoAgent } from '../../src/services/agents/desinformacao.agent.js';

describe('DesinformacaoAgent - Testes de Unidade (TU10 - TU11)', () => {
  const agent = new DesinformacaoAgent();

  // TU10: Análise de texto sensacionalista com padrões de boato
  it('TU10: Deve identificar alto risco de desinformação em textos com clickbait e apelo conspiratório (HU09, RN18)', async () => {
    const textoBoato =
      'URGENTE!! Revelado o segredo que a mídia esconde sobre o novo remédio caseiro! ' +
      'Compartilhe antes que apaguem das redes sociais!!!';

    const resultado = await agent.analisar(textoBoato);

    expect(resultado.classificacao).toBe('Alto risco de desinformação');
    expect(resultado.achados.length).toBeGreaterThan(0);

    const achadoSensacionalismo = resultado.achados.find(a =>
      a.categoria.includes('Linguagem Sensacionalista')
    );
    expect(achadoSensacionalismo).toBeDefined();
    expect(achadoSensacionalismo?.nivel_relevancia).toBe('ALTO');

    // RN19: Deve conter fontes de checagem confiáveis
    expect(resultado.fontes.length).toBeGreaterThan(0);
    expect(resultado.fontes.some(f => f.dominio.includes('aosfatos.org'))).toBe(true);
  });

  // TU11: Análise de texto neutro e embasado
  it('TU11: Deve indicar baixo risco em textos informativos com citação a estudos (HU09, RN20)', async () => {
    const textoInformativo =
      'De acordo com relatório divulgado hoje pelo Ministério da Saúde, ' +
      'o índice de vacinação infantil aumentou no último trimestre. ' +
      'Pesquisadores da universidade destacaram a relevância dos dados.';

    const resultado = await agent.analisar(textoInformativo);

    expect(resultado.classificacao).toBe('Baixo risco de desinformação');
    expect(resultado.resultado).toContain('tom predominantemente informativo');
  });
});
