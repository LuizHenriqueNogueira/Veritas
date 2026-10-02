import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

interface HistoryViewProps {
  onSelectAnalise: (analiseId: number) => void;
  onNewAnalysis: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  onSelectAnalise,
  onNewAnalysis
}) => {
  const [analises, setAnalises] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [agenteFiltro, setAgenteFiltro] = useState<string>('');
  const [busca, setBusca] = useState<string>('');
  const [carregando, setCarregando] = useState(false);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const [listaAgentes, listaAnalises] = await Promise.all([
        api.getAgentes(),
        api.getAnalises({
          agenteId: agenteFiltro ? Number(agenteFiltro) : undefined,
          busca: busca.trim() || undefined
        })
      ]);
      setAgentes(listaAgentes);
      setAnalises(listaAnalises);
    } catch (err: any) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [agenteFiltro]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    carregarDados();
  };

  const formatarData = (dataStr: string) => {
    try {
      const d = new Date(dataStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dataStr;
    }
  };

  const getNomeAgente = (agenteId: number) => {
    const a = agentes.find(item => item.id === agenteId);
    return a ? a.nome : `Agente #${agenteId}`;
  };

  return (
    <div>
      <div className="content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Histórico de análises</h1>
          <p>Acesse suas análises anteriores, consulte os detalhes e compare os resultados obtidos.</p>
        </div>
        <button className="btn-primary" style={{ width: 'auto', padding: '10px 18px' }} onClick={onNewAnalysis}>
          ➕ Nova análise
        </button>
      </div>

      <div className="history-filters">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 12, flex: 1 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Pesquisar por conteúdo, classificação ou parecer..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          <button type="submit" className="btn-secondary">
            Buscar
          </button>
        </form>

        <select
          className="form-input"
          style={{ width: 220 }}
          value={agenteFiltro}
          onChange={e => setAgenteFiltro(e.target.value)}
        >
          <option value="">Todos os agentes</option>
          {agentes.map(ag => (
            <option key={ag.id} value={ag.id}>
              {ag.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="table-container">
        {carregando ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            Carregando histórico...
          </div>
        ) : analises.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhuma análise encontrada no histórico.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>DATA E HORA</th>
                <th>CONTEÚDO</th>
                <th>TIPO</th>
                <th>AGENTE</th>
                <th>RESULTADO</th>
                <th>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {analises.map(item => (
                <tr key={item.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: '#64748b' }}>
                    {formatarData(item.data_criacao)}
                  </td>
                  <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.conteudo || item.url}
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 4,
                        backgroundColor: '#f1f5f9',
                        fontWeight: 600
                      }}
                    >
                      {item.tipo_entrada}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{getNomeAgente(item.agente_id)}</td>
                  <td>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color:
                          item.classificacao && item.classificacao.toLowerCase().includes('alto')
                            ? '#b91c1c'
                            : item.classificacao && item.classificacao.toLowerCase().includes('médio')
                            ? '#b45309'
                            : '#15803d'
                      }}
                    >
                      {item.classificacao || item.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => onSelectAnalise(item.id)}
                    >
                      Ver detalhes ↗
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
