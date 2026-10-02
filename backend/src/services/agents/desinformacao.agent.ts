// ========================================================
// Analisador IA - Veritas
// Agente Especializado: Desinformação
// Atende a HU09, RN07, RN08, RN17, RN18, RN19, RN20, RN21
// ========================================================

import { ResultadoAgente } from '../../models/index.js';

export class DesinformacaoAgent {
  readonly nome = 'Desinformação';
  readonly tipo = 'desinformacao';

  /**
   * Executa a análise contextual procurando indícios de desinformação,
   * sensacionalismo, viés extremo, ausência de fontes e teorias conspiratórias.
   */
  async analisar(conteudo: string): Promise<ResultadoAgente> {
    if (!conteudo || conteudo.trim().length === 0) {
      throw new Error('Conteúdo textual não fornecido para o Agente de Desinformação.');
    }

    const texto = conteudo.toLowerCase();
    const achados: ResultadoAgente['achados'] = [];
    const fontes: ResultadoAgente['fontes'] = [];

    let pontuacaoRisco = 0;

    // 1. Verificação de termos sensacionalistas e clickbait
    const termosSensacionalistas = [
      'urgente!!', 'bomba!!', 'a mídia esconde', 'revelado o segredo',
      'compartilhe antes que apaguem', 'milagre comprovado', 'cura definitiva',
      'a verdade que ninguém conta', 'escândalo oculto', 'urgente compartilhem'
    ];

    const termosEncontrados = termosSensacionalistas.filter(termo => texto.includes(termo));
    if (termosEncontrados.length > 0) {
      pontuacaoRisco += termosEncontrados.length * 25;
      achados.push({
        categoria: 'Linguagem Sensacionalista e Apelo Emocional',
        descricao: `Identificados gatilhos de clickbait e alarmismo no texto: "${termosEncontrados.join(', ')}".`,
        nivel_relevancia: 'ALTO'
      });
    }

    // 2. Verificação de uso excessivo de pontuação de exclamação e caixa alta
    const contagemExclamacao = (conteudo.match(/!{2,}/g) || []).length;
    if (contagemExclamacao >= 2) {
      pontuacaoRisco += 15;
      achados.push({
        categoria: 'Formatação Enfática Excessiva',
        descricao: 'Uso repetido de pontos de exclamação consecutivos, típico de correntes desinformativas.',
        nivel_relevancia: 'MEDIO'
      });
    }

    // 3. Verificação de citação de fontes e evidências
    const termosFontes = ['segundo estudo', 'conforme publicado', 'de acordo com', 'pesquisadores da', 'dados oficiais', 'fonte:'];
    const possuiFontesCitadas = termosFontes.some(f => texto.includes(f));

    if (!possuiFontesCitadas && conteudo.length > 100) {
      pontuacaoRisco += 20;
      achados.push({
        categoria: 'Ausência de Atribuição a Fontes Confiáveis',
        descricao: 'O conteúdo faz afirmações assertivas sem referenciar estudos, órgãos oficiais ou reportagens checadas.',
        nivel_relevancia: 'MEDIO'
      });
    } else if (possuiFontesCitadas) {
      achados.push({
        categoria: 'Citação a Referências',
        descricao: 'O texto inclui menções a estudos, fontes ou dados contextuais para embasar o conteúdo.',
        nivel_relevancia: 'BAIXO'
      });
    }

    // 4. Determinação da classificação e justificativa (RN18, RN20)
    let classificacao = 'Baixo risco de desinformação';
    let explicacao = '';

    if (pontuacaoRisco >= 50) {
      classificacao = 'Alto risco de desinformação';
      explicacao =
        'O texto analisado apresenta fortes indícios característicos de boatos digitais e desinformação, ' +
        'incluindo apelo à urgência emocional, linguagem alarmista e ausência de fontes primárias checáveis. ' +
        'Recomenda-se cautela antes de compartilhar e consulta a agências de checagem.';
    } else if (pontuacaoRisco >= 20) {
      classificacao = 'Médio risco - Requer verificação complementar';
      explicacao =
        'Foram identificados pontos de atenção no texto, como possíveis exageros retóricos ou falta de fontes claras. ' +
        'A informação não pôde ser confirmada de forma independente e deve ser lida com reserva.';
    } else {
      classificacao = 'Baixo risco de desinformação';
      explicacao =
        'O conteúdo apresenta tom predominantemente informativo e não traz os marcadores clássicos de engenharia de desinformação. ' +
        'Ainda assim, consulte sempre veículos especializados para temas críticos.';
    }

    // Se nenhum achado de alerta foi incluído, registra o achado de conformidade e integridade
    if (achados.length === 0) {
      achados.push({
        categoria: 'Padrão Textual e Verossimilhança',
        descricao: 'Não foram identificados termos sensacionalistas, apelos emocionais ou padrões de desinformação no texto avaliado.',
        nivel_relevancia: 'BAIXO'
      });
    }

    // RN19: Apresentação de fontes/referências de apoio quando disponíveis
    fontes.push(
      {
        titulo: 'Aos Fatos - Agência de Checagem',
        url: 'https://www.aosfatos.org',
        dominio: 'aosfatos.org',
        avaliacao: 'Metodologia certificada pela International Fact-Checking Network (IFCN).'
      },
      {
        titulo: 'Lupa - Agência de Notícias e Checagem',
        url: 'https://lupa.uol.com.br',
        dominio: 'lupa.uol.com.br',
        avaliacao: 'Referência em verificação de fatos e combate a boatos no Brasil.'
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
