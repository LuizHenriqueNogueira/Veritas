import React, { useState } from 'react';

interface ResultViewProps {
  analise: any;
  onNewAnalysis: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({ analise, onNewAnalysis }) => {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const getRiskClass = (classificacao: string = '') => {
    const lower = classificacao.toLowerCase();
    if (lower.includes('alto')) return 'alto';
    if (lower.includes('médio') || lower.includes('medio') || lower.includes('moderado')) return 'medio';
    return 'baixo';
  };

  const handleCopiar = () => {
    const textoCompleto = `[Analisador IA - Veritas]
Agente: ${analise.agente?.nome || 'Especializado'}
Classificação: ${analise.classificacao}
Parecer: ${analise.resultado}
Conteúdo Analisado: ${analise.conteudo || analise.url}
Achados: ${analise.achados?.map((a: any) => `\n- [${a.nivel_relevancia}] ${a.categoria}: ${a.descricao}`).join('')}
`;
    navigator.clipboard.writeText(textoCompleto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const riskClass = getRiskClass(analise.classificacao);

  return (
    <div className="result-container">
      <div className="content-header" style={{ marginBottom: 0 }}>
        <h1>Resultado da análise</h1>
        <p>Confira abaixo o resultado emitido pelo agente selecionado.</p>
      </div>

      <div className="result-header-card">
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Agente Responsável
          </span>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
            🛡️ {analise.agente?.nome || 'Agente Veritas'}
          </h2>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Tipo de entrada: {analise.tipo_entrada}
          </span>
        </div>

        <div className={`risk-badge ${riskClass}`}>
          <span>{riskClass === 'baixo' ? '✅' : riskClass === 'medio' ? '⚠️' : '🚨'}</span>
          <span>{analise.classificacao || 'Concluída'}</span>
        </div>
      </div>

      <div className="result-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="result-card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: '#334155' }}>
              Conteúdo analisado
            </h3>
            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: 14,
                borderRadius: 8,
                fontSize: 13,
                color: '#475569',
                maxHeight: 140,
                overflowY: 'auto'
              }}
            >
              {analise.conteudo || analise.url}
            </div>
          </div>

          <div className="result-card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#334155' }}>
              Explicação detalhada da análise
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: '#1f2937' }}>
              {analise.resultado}
            </p>

            <div
              style={{
                marginTop: 20,
                padding: 12,
                borderRadius: 8,
                backgroundColor: '#f1f5f9',
                fontSize: 12,
                color: '#64748b',
                lineHeight: 1.5
              }}
            >
              ℹ️ <strong>Aviso legal e limitações:</strong> O Veritas atua como ferramenta computacional de auxílio
              à interpretação crítica (RN20). Os resultados não constituem decisão judicial, determinação definitiva
              de fraude nem substituem checagem de fatos profissional ou perícia técnica (RN21).
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="result-card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: '#334155' }}>
              Principais achados
            </h3>
            {analise.achados && analise.achados.length > 0 ? (
              analise.achados.map((a: any, idx: number) => (
                <div key={idx} className={`finding-item ${a.nivel_relevancia}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong style={{ fontSize: 13, color: '#0f172a' }}>{a.categoria}</strong>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor: '#e2e8f0'
                      }}
                    >
                      {a.nivel_relevancia}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{a.descricao}</div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhum achado registrado.</p>
            )}
          </div>

          <div className="result-card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#334155' }}>
              Fontes e referências
            </h3>
            {analise.fontes && analise.fontes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {analise.fontes.map((f: any, idx: number) => (
                  <a
                    key={idx}
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      textDecoration: 'none',
                      color: 'var(--primary)',
                      fontSize: 13,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: 8,
                      borderRadius: 6,
                      backgroundColor: '#f8fafc'
                    }}
                  >
                    <strong>🔗 {f.titulo}</strong>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{f.avaliacao}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sem referências externas adicionais.</p>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'white',
          padding: '16px 24px',
          borderRadius: 12,
          border: '1px solid var(--border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Essa análise foi útil?</span>
          <button
            className={`btn-secondary ${feedback === 'sim' ? 'active' : ''}`}
            style={{ padding: '6px 12px' }}
            onClick={() => setFeedback('sim')}
          >
            👍 Sim
          </button>
          <button
            className={`btn-secondary ${feedback === 'nao' ? 'active' : ''}`}
            style={{ padding: '6px 12px' }}
            onClick={() => setFeedback('nao')}
          >
            👎 Não
          </button>
          {feedback && <span style={{ fontSize: 12, color: 'var(--success)' }}>Obrigado pelo seu feedback!</span>}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary" onClick={handleCopiar}>
            {copiado ? '✅ Copiado!' : '📋 Copiar resultado'}
          </button>
          <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={onNewAnalysis}>
            Nova análise ➕
          </button>
        </div>
      </div>
    </div>
  );
};
