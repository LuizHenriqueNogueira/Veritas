// ========================================================
// Analisador IA - Veritas
// Serviço de Integração com Google Gemini API (@google/genai)
// Atende a HU09, HU10, HU11 e requisitos de IA generativa
// ========================================================

import { GoogleGenAI } from '@google/genai';
import { ResultadoAgente, TipoAgente } from '../../models/index.js';

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private modelName = 'gemini-2.5-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      try {
        this.ai = new GoogleGenAI({ apiKey });
      } catch (err) {
        console.warn('[GeminiService] Falha ao instanciar GoogleGenAI com a chave fornecida:', err);
      }
    }
  }

  isConfigured(): boolean {
    return this.ai !== null;
  }

  /**
   * Executa a análise contextual profunda utilizando o modelo Gemini.
   */
  async analisarComIA(tipoAgente: TipoAgente, conteudo: string): Promise<ResultadoAgente | null> {
    if (!this.ai) {
      return null;
    }

    const instrucoesPorAgente: Record<TipoAgente, string> = {
      desinformacao: `Você é o Agente de Desinformação do Veritas.
Sua missão é avaliar minuciosamente se o texto informado possui indícios de fake news, desinformação, teorias conspiratórias, sensacionalismo, manipulação retórica, apelo emocional exagerado ou ausência de fontes confiáveis.
Retorne um parecer técnico de apoio à decisão, sem emitir juízo definitivo de valor ou verdade absoluta.`,

      fraude_digital: `Você é o Agente de Fraude Digital do Veritas.
Sua missão é detectar indícios de golpes digitais, phishing, engenharia social, coerção por urgência financeira artificial (ex: PIX, bloqueio de conta, Serasa, Receita Federal), promessas irrealistas de prêmios ou tentativa de coleta de senhas e tokens.`,

      link_suspeito: `Você é o Agente de Link Suspeito do Veritas.
Sua missão é avaliar a URL ou domínio informado, buscando indícios de riscos cibernéticos, clonagem de marcas (typosquatting), servidores de phishing, encurtadores maliciosos e ausência de protocolos seguros.`
    };

    const prompt = `
${instrucoesPorAgente[tipoAgente]}

Conteúdo a ser analisado:
"""
${conteudo}
"""

Responda OBRIGATORIAMENTE em formato JSON válido contendo exatamente esta estrutura:
{
  "classificacao": "string curta (ex: 'Baixo risco de desinformação' OU 'Médio risco...' OU 'Alto risco de golpe')",
  "resultado": "string com explicação e justificativa analítica contextual detalhada",
  "achados": [
    {
      "categoria": "string nome da categoria do achado",
      "descricao": "string explicando o ponto identificado",
      "nivel_relevancia": "BAIXO" | "MEDIO" | "ALTO"
    }
  ],
  "fontes": [
    {
      "titulo": "string nome do órgão, agência ou base de consulta",
      "url": "https://...",
      "dominio": "exemplo.org",
      "avaliacao": "string descrevendo a utilidade da fonte"
    }
  ]
}
`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text?.trim();
      if (!responseText) return null;

      const parsed = JSON.parse(responseText);

      // Valida estrutura básica
      if (parsed.classificacao && parsed.resultado && Array.isArray(parsed.achados)) {
        return {
          classificacao: parsed.classificacao,
          resultado: parsed.resultado,
          achados: parsed.achados.map((a: any) => ({
            categoria: a.categoria || 'Ponto Relevante',
            descricao: a.descricao || '',
            nivel_relevancia: ['BAIXO', 'MEDIO', 'ALTO'].includes(a.nivel_relevancia)
              ? a.nivel_relevancia
              : 'MEDIO'
          })),
          fontes: Array.isArray(parsed.fontes) ? parsed.fontes : []
        };
      }
    } catch (err: any) {
      console.warn(`[GeminiService] Erro na chamada ao Gemini (${err.message}). Utilizando motor heurístico fallback.`);
    }

    return null;
  }
}
