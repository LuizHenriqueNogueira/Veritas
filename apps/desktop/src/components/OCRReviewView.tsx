import { Icon } from './Icon.js';
import React, { useState, useRef } from 'react';

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
  const [error,setError]=useState('');
  const textRef=useRef<HTMLTextAreaElement>(null);
  const [texto, setTexto] = useState(initialText);
  const [agenteSelecionado, setAgenteSelecionado] = useState<string>('desinformacao');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) {
      setError('O texto reconhecido não pode estar vazio. Revise ou tire uma nova captura.');textRef.current?.focus();
      return;
    }
    if(agenteSelecionado==='link_suspeito'){try{const u=new URL(texto.trim());if(!['https:','http:'].includes(u.protocol) || /\s/.test(texto.trim()))throw new Error();}catch{setError('Para Link Suspeito, deixe somente uma URL completa no texto revisado.');textRef.current?.focus();return;}}
    setError('');onStartAnalysis(texto.trim(), agenteSelecionado);
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
        {error && <p id="ocr-review-error" role="alert" className="alert-box alert-error">{error}</p>}
        <div className="ocr-review-grid">
          <div>
            <label htmlFor="ocr-reviewed-text" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 8 }}>
              Texto reconhecido (OCR) - Editável
            </label>
            <textarea ref={textRef} id="ocr-reviewed-text" maxLength={10000} aria-invalid={Boolean(error)} aria-describedby="ocr-review-error"
              className="textarea-input"
              style={{ height: 260 }}
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder="Edite ou confira o texto capturado..."
            />

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button type="button" className="btn-secondary" onClick={onNewCapture}>
                <Icon name="ScanLine" /> Tirar nova captura
              </button>
              <button type="button" className="btn-secondary" onClick={() => setTexto('')}>
                <Icon name="Eraser" /> Limpar texto
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 8 }}>
              Escolha o agente para análise
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                className={`agent-card ${agenteSelecionado === 'desinformacao' ? 'selected' : ''}`}
                role="radio" tabIndex={0} aria-checked={agenteSelecionado === 'desinformacao'}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAgenteSelecionado('desinformacao'); } }}
            onClick={() => setAgenteSelecionado('desinformacao')}
              >
                <div className="agent-card-header">
                  <div className="agent-title"><Icon name="ShieldCheck" /> Desinformação</div>
                </div>
                <div className="agent-desc">
                  Verifica possíveis informações falsas, distorcidas ou descontextualizadas.
                </div>
              </div>

              <div
                className={`agent-card ${agenteSelecionado === 'fraude_digital' ? 'selected' : ''}`}
                role="radio" tabIndex={0} aria-checked={agenteSelecionado === 'fraude_digital'}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAgenteSelecionado('fraude_digital'); } }}
            onClick={() => setAgenteSelecionado('fraude_digital')}
              >
                <div className="agent-card-header">
                  <div className="agent-title"><Icon name="CreditCard" /> Fraude Digital</div>
                </div>
                <div className="agent-desc">
                  Identifica possíveis indícios de golpes, phishing e engenharia social.
                </div>
              </div>

              <div
                className={`agent-card ${agenteSelecionado === 'link_suspeito' ? 'selected' : ''}`}
                role="radio" tabIndex={0} aria-checked={agenteSelecionado === 'link_suspeito'}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAgenteSelecionado('link_suspeito'); } }}
            onClick={() => setAgenteSelecionado('link_suspeito')}
              >
                <div className="agent-card-header">
                  <div className="agent-title"><Icon name="Link" /> Link Suspeito</div>
                </div>
                <div className="agent-desc">
                  Exige uma única URL válida no campo de texto revisado.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button type="button" className="btn-secondary" onClick={onCancel} style={{ flex: 1 }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 2 }}>
                Iniciar análise <Icon name="Sparkles" />
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
