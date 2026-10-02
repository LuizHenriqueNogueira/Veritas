import { describe, it, expect } from 'vitest';
import { FraudeDigitalAgent } from '../../src/services/agents/fraude-digital.agent.js';

describe('FraudeDigitalAgent - Testes de Unidade (TU12 - TU13)', () => {
  const agent = new FraudeDigitalAgent();

  // TU12: Detecção de táticas de phishing financeiro e coerção psicológica
  it('TU12: Deve apontar alto risco em comunicações com ameaça de bloqueio e pedido de senha (HU10, RN18)', async () => {
    const textoGolpe =
      'AVISO URGENTE: Sua conta sera bloqueada em 24h por pendências na Receita Federal. ' +
      'Clique no link para atualizar seus dados e digite sua senha de acesso agora mesmo.';

    const resultado = await agent.analisar(textoGolpe);

    expect(resultado.classificacao).toBe('Alto risco de golpe ou tentativa de fraude');

    const achadoUrgencia = resultado.achados.find(a => a.categoria.includes('Engenharia Social'));
    const achadoCredenciais = resultado.achados.find(a => a.categoria.includes('Coleta de Informações'));

    expect(achadoUrgencia).toBeDefined();
    expect(achadoCredenciais).toBeDefined();
    expect(achadoUrgencia?.nivel_relevancia).toBe('ALTO');

    // RN19: Deve indicar referências e cartilhas oficiais como CERT.br
    expect(resultado.fontes.some(f => f.dominio.includes('cert.br'))).toBe(true);
  });

  // TU13: Detecção de texto corporativo legítimo sem solicitação de credenciais
  it('TU13: Deve classificar como baixo risco comunicados rotineiros sem iscas de engenharia social (HU10)', async () => {
    const textoLegitimo =
      'Informamos que nossa equipe de suporte concluiu a manutenção programada do sistema. ' +
      'Nenhuma ação é necessária por parte dos colaboradores.';

    const resultado = await agent.analisar(textoLegitimo);

    expect(resultado.classificacao).toBe('Baixo risco aparente de fraude');
    expect(resultado.resultado).toContain('Não foram identificados termos usuais de phishing');
  });
});
