import { describe, it, expect } from 'vitest';
import { isValidUrl, analyzeUrlStructure } from '../../src/utils/url-validator.js';

describe('UrlValidator - Testes de Unidade (TU05 - TU06)', () => {
  // TU05: Validação de URL canônica com protocolo HTTPS
  it('TU05: Deve validar corretamente uma URL padrão com HTTPS e domínio regular (RN16)', () => {
    const urlSegura = 'https://portal.exemplo.com.br/noticias/artigo-123';
    expect(isValidUrl(urlSegura)).toBe(true);

    const analise = analyzeUrlStructure(urlSegura);
    expect(analise.isValid).toBe(true);
    expect(analise.protocol).toBe('https');
    expect(analise.hostname).toBe('portal.exemplo.com.br');
    expect(analise.isIpAddress).toBe(false);
    expect(analise.hasSuspiciousTld).toBe(false);
  });

  // TU06: Detecção de IP numérico e extensão TLD de risco
  it('TU06: Deve identificar URLs baseadas em endereço IP numérico e TLDs de risco (RN09, RN16)', () => {
    const urlIp = 'http://192.168.1.100/admin/login';
    const analiseIp = analyzeUrlStructure(urlIp);
    expect(analiseIp.isValid).toBe(true);
    expect(analiseIp.isIpAddress).toBe(true);

    const urlSuspeita = 'https://premiacao-exclusiva.xyz/resgate';
    const analiseSuspeita = analyzeUrlStructure(urlSuspeita);
    expect(analiseSuspeita.isValid).toBe(true);
    expect(analiseSuspeita.hasSuspiciousTld).toBe(true);

    // Formato inválido
    expect(isValidUrl('isto-nao-e-uma-url')).toBe(false);
  });
});
