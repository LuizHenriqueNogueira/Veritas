import { describe, it, expect } from 'vitest';
import { LinkSuspeitoAgent } from '../../src/services/agents/link-suspeito.agent.js';

describe('LinkSuspeitoAgent - Testes de Unidade (TU14 - TU15)', () => {
  const agent = new LinkSuspeitoAgent();

  // TU14: Avaliação de URL maliciosa estruturada com IP e login sem TLS
  it('TU14: Deve classificar como alto risco links baseados em IP numérico e caminhos de login inseguros (HU11, RN18)', async () => {
    const urlMaliciosa = 'http://185.220.101.5/banco/login';
    const resultado = await agent.analisar(urlMaliciosa);

    expect(resultado.classificacao).toContain('Alto risco');
    expect(resultado.achados.length).toBeGreaterThan(0);

    const achadoIp = resultado.achados.find(a => a.categoria.includes('Host Baseado em IP'));
    expect(achadoIp).toBeDefined();
    expect(achadoIp?.nivel_relevancia).toBe('ALTO');

    // Fontes de consulta como Google Safe Browsing
    expect(resultado.fontes.some(f => f.dominio.includes('transparencyreport.google.com'))).toBe(true);
  });

  // TU15: Rejeição de link em formato inválido
  it('TU15: Deve rejeitar análises quando o link fornecido não for uma URL válida (RN09, RN16)', async () => {
    await expect(agent.analisar('conteudo-sem-formato-de-url')).rejects.toThrow(
      'O Agente de Link Suspeito requer uma URL com formato válido'
    );
  });
});
