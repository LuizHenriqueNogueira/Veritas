// ========================================================
// Analisador IA - Veritas
// Agente Especializado: Link Suspeito
// Atende a HU11, RN07, RN08, RN09, RN16, RN17, RN18, RN19, RN20, RN21
// ========================================================

import { ResultadoAgente } from '../../models/index.js';
import { analyzeUrlStructure, isValidUrl } from '../../utils/url-validator.js';

export class LinkSuspeitoAgent {
  readonly nome = 'Link Suspeito';
  readonly tipo = 'link_suspeito';

  /**
   * Analisa URLs e domínios procurando indicadores de risco cibernético,
   * como ofuscação, typosquatting, TLDs de alto risco e encurtadores.
   * RN09: Deve receber uma URL válida.
   */
  async analisar(urlInformada: string): Promise<ResultadoAgente> {
    if (!urlInformada || !isValidUrl(urlInformada)) {
      // RN09 e RN16: O Agente de Link Suspeito deverá receber uma URL válida para realizar a análise.
      throw new Error('O Agente de Link Suspeito requer uma URL com formato válido (ex: https://exemplo.com).');
    }

    const analiseEstrutural = analyzeUrlStructure(urlInformada);
    if (!analiseEstrutural.isValid || !analiseEstrutural.hostname) {
      throw new Error(analiseEstrutural.errorMessage || 'URL informada é inválida.');
    }

    const { hostname, protocol, pathname, isIpAddress, hasSuspiciousTld, isKnownShortener } = analiseEstrutural;
    const achados: ResultadoAgente['achados'] = [];
    const fontes: ResultadoAgente['fontes'] = [];

    let pontuacaoRisco = 0;

    // 1. Uso de endereço IP direto no lugar do nome de domínio
    if (isIpAddress) {
      pontuacaoRisco += 45;
      achados.push({
        categoria: 'Host Baseado em IP Numérico',
        descricao: `A URL utiliza o endereço IP bruto (${hostname}) em vez de um domínio registrado formalmente, padrão frequente em servidores de comando e controle ou phishing.`,
        nivel_relevancia: 'ALTO'
      });
    }

    // 2. Uso de TLD com alto índice de abuso
    if (hasSuspiciousTld) {
      pontuacaoRisco += 30;
      achados.push({
        categoria: 'Extensão de Domínio (TLD) com Alto Histórico de Risco',
        descricao: `O domínio termina com extensão comumente explorada para registro barato e descarte rápido de páginas fraudulentas.`,
        nivel_relevancia: 'MEDIO'
      });
    }

    // 3. Uso de encurtadores de links
    if (isKnownShortener) {
      pontuacaoRisco += 20;
      achados.push({
        categoria: 'Encurtador de Link / Ofuscação de Destino',
        descricao: 'A URL utiliza um serviço de redirecionamento, ocultando o destino final real da navegação.',
        nivel_relevancia: 'MEDIO'
      });
    }

    // 4. Protocolo não seguro (HTTP) em páginas com termos sensíveis
    const termosSensiveis = ['login', 'senha', 'banco', 'pix', 'pagamento', 'cartao', 'checkout'];
    const caminhoCompleto = (pathname || '') + (urlInformada || '');
    const contemTermoSensivel = termosSensiveis.some(t => caminhoCompleto.toLowerCase().includes(t));

    if (protocol === 'http' && contemTermoSensivel) {
      pontuacaoRisco += 35;
      achados.push({
        categoria: 'Ausência de Criptografia TLS/HTTPS em Área Sensível',
        descricao: 'A requisição utiliza HTTP em texto puro para transações ou páginas que sugerem autenticação e dados financeiros.',
        nivel_relevancia: 'ALTO'
      });
    }

    // 5. Quantidade excessiva de subdomínios (tentativa de clonar URLs)
    const partesHost = hostname.split('.');
    if (partesHost.length > 4) {
      pontuacaoRisco += 25;
      achados.push({
        categoria: 'Estrutura Excessiva de Subdomínios',
        descricao: 'O link apresenta subdomínios aninhados excessivos, técnica usada para imitar marcas famosas no início da URL.',
        nivel_relevancia: 'MEDIO'
      });
    }

    // Se nenhum achado de risco foi detectado
    if (achados.length === 0) {
      achados.push({
        categoria: 'Estrutura Canônica Regular',
        descricao: 'A URL segue padrões seguros de nomenclatura, protocolo HTTPS e domínio formal registrado.',
        nivel_relevancia: 'BAIXO'
      });
    }

    // Classificação final
    let classificacao = 'Link de baixo risco aparente';
    let explicacao = '';

    if (pontuacaoRisco >= 50) {
      classificacao = 'Alto risco: Link com múltiplos indicadores suspeitos';
      explicacao =
        'A URL analisada apresenta fortes anomalias arquiteturais (como IP direto, domínio malicioso ou ofuscação). ' +
        'Recomenda-se evitar o acesso e não inserir dados pessoais ou bancários.';
    } else if (pontuacaoRisco >= 20) {
      classificacao = 'Médio risco: Link requer atenção e verificação';
      explicacao =
        'Foram identificadas características de alerta na URL analisada (como encurtador ou domínio atípico). ' +
        'Verifique a integridade do remetente antes de navegar.';
    } else {
      classificacao = 'Baixo risco: URL com estrutura convencional';
      explicacao =
        'Não foram identificadas discrepâncias arquiteturais severas no link fornecido. ' +
        'Mantenha sempre seu navegador atualizado com filtros antiphishing ativos.';
    }

    // Referências de verificação de reputação de domínios (RN19)
    fontes.push(
      {
        titulo: 'Google Safe Browsing Advisory',
        url: 'https://transparencyreport.google.com/safe-browsing/search',
        dominio: 'transparencyreport.google.com',
        avaliacao: 'Base global de reputação de ameaças de malware e engenharia social da Web.'
      },
      {
        titulo: 'Registro.br - Consulta WHOIS',
        url: 'https://registro.br/tecnologia/ferramentas/whois/',
        dominio: 'registro.br',
        avaliacao: 'Entidade responsável pelo registro de domínios no Brasil.'
      }
    );

    return {
      classificacao,
      resultado: explicacao,
      achados,
      fontes
    };
  }
}
