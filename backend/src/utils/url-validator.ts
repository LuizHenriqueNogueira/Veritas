// ========================================================
// Analisador IA - Veritas
// Validador e Analisador Sintático de URLs
// Atende aos requisitos RN09, RN16 e RNF13
// ========================================================

export interface UrlAnalysisDetails {
  isValid: boolean;
  normalizedUrl?: string;
  protocol?: string;
  hostname?: string;
  pathname?: string;
  isIpAddress: boolean;
  hasSuspiciousTld: boolean;
  isKnownShortener: boolean;
  errorMessage?: string;
}

const SUSPICIOUS_TLDS = [
  '.xyz', '.top', '.zip', '.mov', '.work', '.click', '.loan', '.racing',
  '.country', '.download', '.stream', '.review', '.trade', '.accountant'
];

const KNOWN_SHORTENERS = [
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'cutt.ly', 'rb.gy'
];

const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/**
 * Valida se uma string possui o formato de uma URL válida (http ou https) com domínio consistente.
 */
export function isValidUrl(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim();
  if (trimmed.length < 4 || trimmed.length > 2048) return false;

  try {
    const candidate = trimmed.match(/^https?:\/\//i) ? trimmed : `http://${trimmed}`;
    const parsed = new URL(candidate);
    const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    const hasValidHost = (parsed.hostname.includes('.') && !parsed.hostname.endsWith('.')) || parsed.hostname === 'localhost';
    return isHttp && hasValidHost;
  } catch {
    return false;
  }
}

/**
 * Normaliza e analisa a estrutura de uma URL fornecida pelo usuário.
 */
export function analyzeUrlStructure(input: string): UrlAnalysisDetails {
  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    return {
      isValid: false,
      isIpAddress: false,
      hasSuspiciousTld: false,
      isKnownShortener: false,
      errorMessage: 'A URL informada não pode ser vazia.'
    };
  }

  const trimmed = input.trim();
  const withProtocol = trimmed.match(/^https?:\/\//i) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    const hostname = parsed.hostname.toLowerCase();

    if (!hostname || !hostname.includes('.') && hostname !== 'localhost') {
      return {
        isValid: false,
        isIpAddress: false,
        hasSuspiciousTld: false,
        isKnownShortener: false,
        errorMessage: 'O domínio da URL informada é inválido ou incompleto.'
      };
    }

    const isIpAddress = IPV4_REGEX.test(hostname);
    const hasSuspiciousTld = SUSPICIOUS_TLDS.some(tld => hostname.endsWith(tld));
    const isKnownShortener = KNOWN_SHORTENERS.includes(hostname);

    return {
      isValid: true,
      normalizedUrl: parsed.toString(),
      protocol: parsed.protocol.replace(':', ''),
      hostname,
      pathname: parsed.pathname,
      isIpAddress,
      hasSuspiciousTld,
      isKnownShortener
    };
  } catch (err: any) {
    return {
      isValid: false,
      isIpAddress: false,
      hasSuspiciousTld: false,
      isKnownShortener: false,
      errorMessage: 'A URL não possui um formato sintático válido (ex: https://exemplo.com).'
    };
  }
}
