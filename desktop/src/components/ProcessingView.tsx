import React from 'react';

interface ProcessingViewProps {
  agenteTipo: string;
  conteudoPrevio: string;
  onCancel: () => void;
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({
  agenteTipo,
  conteudoPrevio,
  onCancel
}) => {
  const nomesAgentes: Record<string, string> = {
    desinformacao: 'Agente de Desinformação',
    fraude_digital: 'Agente de Fraude Digital',
    link_suspeito: 'Agente de Link Suspeito'
  };

  return (
    <div className="processing-container">
      <div className="spinner"></div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
        Análise em andamento
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 28, maxWidth: 460 }}>
        O Veritas está processando o conteúdo com o <strong>{nomesAgentes[agenteTipo] || 'Agente'}</strong>.
        Isso pode levar alguns instantes.
      </p>

      <div
        style={{
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '16px 24px',
          maxWidth: 480,
          width: '100%',
          textAlign: 'left',
          marginBottom: 32
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
          Prévia do Conteúdo Enviado
        </div>
        <div style={{ fontSize: 13, color: '#334155', maxHeight: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {conteudoPrevio || 'Conteúdo em processamento...'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#16a34a' }}>
          ✓ Recebendo conteúdo
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#2563eb', fontWeight: 600 }}>
          ⏳ Executando heurísticas e IA
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8' }}>
          ○ Consolidando achados
        </div>
      </div>

      <button className="btn-secondary" onClick={onCancel}>
        Cancelar análise
      </button>
    </div>
  );
};
