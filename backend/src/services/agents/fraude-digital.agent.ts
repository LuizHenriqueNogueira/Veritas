// ========================================================
// Analisador IA - Veritas
// Agente Especializado: Fraude Digital
// Atende a HU10, RN07, RN08, RN17, RN18, RN19, RN20, RN21
// ========================================================

import { ResultadoAgente } from '../../models/index.js';

export class FraudeDigitalAgent {
  readonly nome = 'Fraude Digital';
  readonly tipo = 'fraude_digital';

  /**
   * Analisa mensagens e comunicações procurando táticas de phishing,
   * engenharia social, urgência financeira artificial e golpes digitais.
   */
  async analisar(conteudo: string): Promise<ResultadoAgente> {
    if (!conteudo || conteudo.trim().length === 0) {
      throw new Error('Conteúdo textual não fornecido para o Agente de Fraude Digital.');
    }

    const texto = conteudo.toLowerCase();
    const achados: ResultadoAgente['achados'] = [];
    const fontes: ResultadoAgente['fontes'] = [];

    let pontuacaoGolpe = 0;

    // 1. Táticas de Urgência e Ameaça Financeira
    const padroesUrgencia = [
      'sua conta sera bloqueada', 'sua conta será bloqueada',
      'regularize agora', 'prazo expira em 24h', 'evite o cancelamento imediato',
      'sua chave pix foi suspensa', 'urgente regularize', 'bloqueio judicial iminente'
    ];
    const urgenciasDetectadas = padroesUrgencia.filter(p => texto.includes(p));
    if (urgenciasDetectadas.length > 0) {
      pontuacaoGolpe += 35;
      achados.push({
        categoria: 'Engenharia Social por Urgência e Intimidação',
        descricao: 'Uso de pressão psicológica e ameaça de bloqueio de serviços para induzir ação impensada do usuário.',
        nivel_relevancia: 'ALTO'
      });
    }

    // 2. Iscas de Recompensa, Sorteios e Dinheiro Fácil
    const padroesRecompensa = [
      'voce foi sorteado', 'você foi sorteado', 'resgate seu beneficio',
      'resgate seu benefício', 'parabens voce ganhou', 'parabéns você ganhou',
      'lucro garantido', 'investimento com retorno diario', 'pix em dobro'
    ];
    const recompensasDetectadas = padroesRecompensa.filter(p => texto.includes(p));
    if (recompensasDetectadas.length > 0) {
      pontuacaoGolpe += 30;
      achados.push({
        categoria: 'Isca Financeira Irrealista',
        descricao: 'Promessa de benefícios financeiros inesperados, prêmios ou lucros fáceis sem contrapartida clara.',
        nivel_relevancia: 'ALTO'
      });
    }

    // 3. Solicitação de Dados Sensíveis, Tokens ou Pagamento Imediato
    const padroesDadosSensiveis = [
      'digite sua senha', 'informe seu token', 'confirme os dados do cartao',
      'dados do cartão', 'pague a taxa para liberar', 'envie o comprovante pix',
      'clique no link para atualizar seus dados'
    ];
    const dadosDetectados = padroesDadosSensiveis.filter(p => texto.includes(p));
    if (dadosDetectados.length > 0) {
      pontuacaoGolpe += 40;
      achados.push({
        categoria: 'Coleta de Informações Sensíveis / Phishing',
        descricao: 'Tentativa de obter credenciais de segurança, senhas bancárias ou pagamentos de taxas não reconhecidas.',
        nivel_relevancia: 'ALTO'
      });
    }

    // 4. Personificação de Órgãos Oficiais ou Instituições Bancárias
    const padroesInstituicoes = ['receita federal', 'caixa economica', 'correios', 'banco do brasil', 'serasa'];
    const instituicaoMencionada = padroesInstituicoes.some(i => texto.includes(i));
    if (instituicaoMencionada && (urgenciasDetectadas.length > 0 || dadosDetectados.length > 0)) {
      pontuacaoGolpe += 25;
      achados.push({
        categoria: 'Possível Falsa Identidade Institucional',
        descricao: 'Menção a bancos ou órgãos públicos associada a pedidos de urgência ou links externos suspeitos.',
        nivel_relevancia: 'ALTO'
      });
    }

    // Classificação final e parecer
    let classificacao = 'Baixo risco de fraude';
    let explicacao = '';

    if (pontuacaoGolpe >= 50) {
      classificacao = 'Alto risco de golpe ou tentativa de fraude';
      explicacao =
        'O texto analisado possui múltiplos marcadores clássicos de phishing e engenharia social. ' +
        'Recomenda-se veementemente NÃO clicar em links, NÃO efetuar pagamentos e NÃO fornecer códigos de segurança ou senhas.';
    } else if (pontuacaoGolpe >= 25) {
      classificacao = 'Risco moderado de engenharia social';
      explicacao =
        'A mensagem apresenta elementos que requerem atenção redobrada, como solicitações inesperadas ou tom de urgência. ' +
        'Confira o canal oficial da empresa antes de qualquer ação.';
    } else {
      classificacao = 'Baixo risco aparente de fraude';
      explicacao =
        'Não foram identificados termos usuais de phishing ou extorsão digital nesta amostra. ' +
        'Mantenha sempre boas práticas de segurança ao compartilhar dados.';
    }

    if (achados.length === 0) {
      achados.push({
        categoria: 'Padrão de Comunicação Neutra',
        descricao: 'Não foram detectadas táticas de coerção por urgência, solicitações de credenciais ou iscas financeiras.',
        nivel_relevancia: 'BAIXO'
      });
    }

    // Fontes oficiais de proteção ao consumidor e segurança digital
    fontes.push(
      {
        titulo: 'CERT.br - Cartilha de Segurança para a Internet',
        url: 'https://cartilha.cert.br/golpes/',
        dominio: 'cert.br',
        avaliacao: 'Guia oficial do Centro de Estudos, Resposta e Tratamento de Incidentes de Segurança no Brasil.'
      },
      {
        titulo: 'FEBRABAN - Prevenção a Fraudes e Golpes Financeiros',
        url: 'https://antifraudes.febraban.org.br',
        dominio: 'febraban.org.br',
        avaliacao: 'Orientações oficiais do setor bancário sobre prevenção de fraudes eletrônicas.'
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
