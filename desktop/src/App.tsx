import React, { useState, useEffect } from 'react';
import { api, getAuthToken, removeAuthToken } from './api.js';
import { Sidebar } from './components/Sidebar.js';
import { LoginView } from './components/LoginView.js';
import { RegisterView } from './components/RegisterView.js';
import { NewAnalysisView } from './components/NewAnalysisView.js';
import { CaptureOverlay } from './components/CaptureOverlay.js';
import { OCRReviewView } from './components/OCRReviewView.js';
import { ProcessingView } from './components/ProcessingView.js';
import { ResultView } from './components/ResultView.js';
import { HistoryView } from './components/HistoryView.js';

export function App() {
  const [usuario, setUsuario] = useState<{ id: number; nome: string; email: string } | null>(null);
  const [currentView, setCurrentView] = useState<string>('login');
  const [showCaptureOverlay, setShowCaptureOverlay] = useState<boolean>(false);
  const [capturedOcrText, setCapturedOcrText] = useState<string>('');
  const [currentProcessing, setCurrentProcessing] = useState<{ agenteTipo: string; conteudo: string } | null>(null);
  const [activeResult, setActiveResult] = useState<any>(null);
  const [appIniciado, setAppIniciado] = useState<boolean>(false);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      api.me()
        .then(u => {
          setUsuario(u);
          setCurrentView('new-analysis');
        })
        .catch(() => {
          removeAuthToken();
          setCurrentView('login');
        })
        .finally(() => setAppIniciado(true));
    } else {
      setAppIniciado(true);
    }
  }, []);

  const handleLogout = () => {
    removeAuthToken();
    setUsuario(null);
    setCurrentView('login');
  };

  const handleIniciarAnalise = async (params: {
    tipo_entrada: 'TEXTO' | 'CAPTURA_OCR' | 'URL';
    agente_tipo: string;
    conteudo?: string;
    url?: string;
  }) => {
    setCurrentProcessing({
      agenteTipo: params.agente_tipo,
      conteudo: params.conteudo || params.url || ''
    });
    setCurrentView('processing');

    try {
      // Simula feedback visual imediato antes da resposta (RNF06)
      await new Promise(r => setTimeout(r, 600));

      const res = await api.createAnalise(params);
      setActiveResult(res);
      setCurrentView('result');
    } catch (err: any) {
      alert(`Erro na análise: ${err.message}`);
      setCurrentView('new-analysis');
    } finally {
      setCurrentProcessing(null);
    }
  };

  const handleAbrirAnaliseDoHistorico = async (id: number) => {
    try {
      const res = await api.getAnaliseById(id);
      setActiveResult(res);
      setCurrentView('result');
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar detalhes da análise.');
    }
  };

  if (!appIniciado) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Iniciando Veritas...</div>;
  }

  // Telas não autenticadas
  if (!usuario) {
    if (currentView === 'register') {
      return (
        <RegisterView
          onSuccess={u => {
            setUsuario(u);
            setCurrentView('new-analysis');
          }}
          onGoToLogin={() => setCurrentView('login')}
        />
      );
    }
    return (
      <LoginView
        onSuccess={u => {
          setUsuario(u);
          setCurrentView('new-analysis');
        }}
        onGoToRegister={() => setCurrentView('register')}
      />
    );
  }

  // Telas autenticadas do Veritas Desktop
  return (
    <div className="app-container">
      <Sidebar
        currentView={currentView}
        onNavigate={view => setCurrentView(view)}
        usuario={usuario}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {currentView === 'new-analysis' && (
          <NewAnalysisView
            onStartAnalysis={handleIniciarAnalise}
            onOpenCapture={() => setShowCaptureOverlay(true)}
          />
        )}

        {currentView === 'ocr-review' && (
          <OCRReviewView
            initialText={capturedOcrText}
            onStartAnalysis={(textoRevisado, agenteTipo) => {
              handleIniciarAnalise({
                tipo_entrada: 'CAPTURA_OCR',
                agente_tipo: agenteTipo,
                conteudo: textoRevisado
              });
            }}
            onNewCapture={() => {
              setCurrentView('new-analysis');
              setShowCaptureOverlay(true);
            }}
            onCancel={() => setCurrentView('new-analysis')}
          />
        )}

        {currentView === 'processing' && currentProcessing && (
          <ProcessingView
            agenteTipo={currentProcessing.agenteTipo}
            conteudoPrevio={currentProcessing.conteudo}
            onCancel={() => setCurrentView('new-analysis')}
          />
        )}

        {currentView === 'result' && activeResult && (
          <ResultView
            analise={activeResult}
            onNewAnalysis={() => setCurrentView('new-analysis')}
          />
        )}

        {currentView === 'history' && (
          <HistoryView
            onSelectAnalise={handleAbrirAnaliseDoHistorico}
            onNewAnalysis={() => setCurrentView('new-analysis')}
          />
        )}

        {currentView === 'settings' && (
          <div>
            <div className="content-header">
              <h1>Configurações do Veritas</h1>
              <p>Gerencie preferências de rede, chaves de API e privacidade de dados.</p>
            </div>
            <div className="analysis-input-card">
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>Privacidade e Armazenamento (RN15, RNF11)</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                ✅ O descarte imediato de imagens capturadas após OCR está ativo por padrão.<br />
                ✅ Comunicação segura via TLS/HTTPS habilitada.<br />
                ✅ Histórico associado exclusivamente à conta de {usuario.nome}.
              </p>
            </div>
          </div>
        )}

        {currentView === 'help' && (
          <div>
            <div className="content-header">
              <h1>Central de Ajuda e Orientações</h1>
              <p>Orientações de uso dos 3 agentes especializados e diretrizes de interpretação.</p>
            </div>
            <div className="analysis-input-card">
              <h3 style={{ fontSize: 16, marginBottom: 8 }}>Sobre os Agentes</h3>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                • <strong>Desinformação:</strong> Avalia estrutura da narrativa, tom sensacionalista e consistência de fontes.<br />
                • <strong>Fraude Digital:</strong> Analisa gatilhos de coerção psicológica, falsas urgências e links de phishing bancário.<br />
                • <strong>Link Suspeito:</strong> Examina características do domínio, IPs diretos, protocolos e redirecionadores.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Modal / Overlay da Captura de Tela (Tela 4) */}
      {showCaptureOverlay && (
        <CaptureOverlay
          onCaptureCompleted={texto => {
            setShowCaptureOverlay(false);
            setCapturedOcrText(texto);
            setCurrentView('ocr-review');
          }}
          onCancel={() => setShowCaptureOverlay(false)}
        />
      )}
    </div>
  );
}

export default App;
