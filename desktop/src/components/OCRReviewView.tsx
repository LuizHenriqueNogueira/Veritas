import React, { useState } from 'react';

interface OCRReviewViewProps {
  initialText: string;
  onStartAnalysis: (text: string, agenteTipo: string) => void;
  onNewCapture: () => void;
  onCancel: () => void;
}

export const OCRReviewView: React.FC<OCRReviewViewProps> = ({
  initialText,
  onStartAnalysis,
  onNewCapture,
  onCancel
}) => {
  const [texto, setTexto] = useState(initialText);
  const [agenteSelecionado, setAgenteSelecionado] = useState<string>('desinformacao');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) {
      alert('O texto reconhecido não pode estar vazio.');
      return;
    }
    onStartAnalysis(texto, agenteSelecionado);
  };

  return (
    <div className="ocr-review-container">
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Passo 2 de 3</span>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>Revise o texto capturado</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Confira o texto extraído da imagem. Se necessário, faça ajustes antes de iniciar a análise.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr', gap: 24 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 8 }}>
              Texto reconhecido (OCR) - Editável
            </label>
            <textarea
              className="textarea-input"
              style={{ height: 260 }}
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder="Edite ou confira o texto capturado..."
            />

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button type="button" className="btn-secondary" onClick={onNewCapture}>
                📸 Tirar nova captura
              </button>
              <button type="button" className="btn-secondary" onClick={() => setTexto('')}>
                🧹 Limpar texto
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 8 }}>
              Escolha o agente para análise
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                className={`agent-card ${agenteSelecionado === 'desinformacao' ? 'selected' : ''}`}
                onClick={() => setAgenteSelecionado('desinformacao')}
              >
                <div className="agent-card-header">
                  <div className="agent-title">🛡️ Desinformação</div>
                </div>
                <div className="agent-desc">
                  Verifica possíveis informações falsas, distorcidas ou descontextualizadas.
                </div>
              </div>

              <div
                className={`agent-card ${agenteSelecionado === 'fraude_digital' ? 'selected' : ''}`}
                onClick={() => setAgenteSelecionado('fraude_digital')}
              >
                <div className="agent-card-header">
                  <div className="agent-title">💳 Fraude Digital</div>
                </div>
                <div className="agent-desc">
                  Identifica possíveis indícios de golpes, phishing e engenharia social.
                </div>
              </div>

              <div
                className={`agent-card ${agenteSelecionado === 'link_suspeito' ? 'selected' : ''}`}
                onClick={() => setAgenteSelecionado('link_suspeito')}
              >
                <div className="agent-card-header">
                  <div className="agent-title">🔗 Link Suspeito</div>
                </div>
                <div className="agent-desc">
                  Analisa riscos relacionados a URLs e domínios encontrados no texto.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button type="button" className="btn-secondary" onClick={onCancel} style={{ flex: 1 }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 2 }}>
                Iniciar análise ✨
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
