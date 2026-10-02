import React, { useState } from 'react';

interface NewAnalysisViewProps {
  onStartAnalysis: (params: {
    tipo_entrada: 'TEXTO' | 'CAPTURA_OCR' | 'URL';
    agente_tipo: string;
    conteudo?: string;
    url?: string;
  }) => void;
  onOpenCapture: () => void;
}

export const NewAnalysisView: React.FC<NewAnalysisViewProps> = ({
  onStartAnalysis,
  onOpenCapture
}) => {
  const [texto, setTexto] = useState('');
  const [url, setUrl] = useState('');
  const [agenteTipo, setAgenteTipo] = useState<string>('desinformacao');
  const [erro, setErro] = useState<string | null>(null);

  const handleAnalisar = () => {
    setErro(null);

    // Validações de entrada de acordo com o agente selecionado
    if (agenteTipo === 'link_suspeito') {
      const urlAlvo = url.trim() || texto.trim();
      if (!urlAlvo) {
        setErro('O Agente de Link Suspeito exige que seja informada uma URL no campo de link ou texto.');
        return;
      }
      onStartAnalysis({
        tipo_entrada: 'URL',
        agente_tipo: agenteTipo,
        url: urlAlvo
      });
      return;
    }

    if (!texto.trim() && !url.trim()) {
      setErro('Insira ou cole um texto, ou informe uma URL para realizar a análise.');
      return;
    }

    if (url.trim() && !texto.trim()) {
      onStartAnalysis({
        tipo_entrada: 'URL',
        agente_tipo: agenteTipo,
        url: url.trim()
      });
    } else {
      onStartAnalysis({
        tipo_entrada: 'TEXTO',
        agente_tipo: agenteTipo,
        conteudo: texto.trim()
      });
    }
  };

  return (
    <div>
      <div className="content-header">
        <h1>Nova análise</h1>
        <p>Escolha como deseja verificar o conteúdo: texto direto, link ou captura com OCR.</p>
      </div>

      {erro && <div className="alert-box alert-error">{erro}</div>}

      <div className="analysis-input-card">
        <div className="input-section-title">
          <span>📝</span> <span>Texto</span>
        </div>
        <textarea
          className="textarea-input"
          placeholder="Digite ou cole um texto para análise contextual..."
          value={texto}
          onChange={e => setTexto(e.target.value)}
        />

        <div className="input-section-title" style={{ marginTop: 20 }}>
          <span>🔗</span> <span>Link</span>
        </div>
        <div className="link-input-row">
          <input
            type="text"
            className="form-input"
            placeholder="Cole ou digite uma URL (ex: https://noticia-exemplo.com/artigo)"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
            onClick={onOpenCapture}
          >
            <span>📷</span> <span>Capturar da tela</span>
          </button>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#334155' }}>
          Escolha o agente de verificação
        </h3>

        <div className="agents-grid">
          <div
            className={`agent-card ${agenteTipo === 'desinformacao' ? 'selected' : ''}`}
            onClick={() => setAgenteTipo('desinformacao')}
          >
            <div className="agent-card-header">
              <div className="agent-icon desinformacao">🛡️</div>
            </div>
            <div className="agent-title">Desinformação</div>
            <div className="agent-desc">
              Verifica possíveis informações falsas, boatos, alarmismo e distorções contextuais.
            </div>
          </div>

          <div
            className={`agent-card ${agenteTipo === 'fraude_digital' ? 'selected' : ''}`}
            onClick={() => setAgenteTipo('fraude_digital')}
          >
            <div className="agent-card-header">
              <div className="agent-icon fraude_digital">💳</div>
            </div>
            <div className="agent-title">Fraude Digital</div>
            <div className="agent-desc">
              Identifica golpes, phishing, táticas de engenharia social e falsas cobranças.
            </div>
          </div>

          <div
            className={`agent-card ${agenteTipo === 'link_suspeito' ? 'selected' : ''}`}
            onClick={() => setAgenteTipo('link_suspeito')}
          >
            <div className="agent-card-header">
              <div className="agent-icon link_suspeito">🔗</div>
            </div>
            <div className="agent-title">Link Suspeito</div>
            <div className="agent-desc">
              Analisa riscos de URLs, domínios maliciosos, servidores de phishing e anomalias de rede.
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          style={{ padding: '14px 28px', fontSize: 16, maxWidth: 280, display: 'block', margin: '0 auto' }}
          onClick={handleAnalisar}
        >
          Analisar Agora
        </button>
      </div>
    </div>
  );
};
