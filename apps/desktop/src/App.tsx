import {HelpView} from './components/HelpView.js';
import {AdminView} from './components/AdminView.js';
import {usePreferences} from './preferences.js';
import { SettingsView } from './components/SettingsView.js';
import React, { useState, useEffect, useRef } from 'react';
import { api, getAuthToken, removeAuthToken } from './api.js';
import { Sidebar } from './components/Sidebar.js';
import { LoginView } from './components/LoginView.js';
import { RegisterView } from './components/RegisterView.js';
import { NewAnalysisView,AnalysisDraft,AnalysisInput } from './components/NewAnalysisView.js';
import { CaptureOverlay } from './components/CaptureOverlay.js';
import { OCRReviewView } from './components/OCRReviewView.js';
import { ProcessingView } from './components/ProcessingView.js';
import { ResultView } from './components/ResultView.js';
import { HistoryView } from './components/HistoryView.js';

export function App() {
  const requestId = useRef(0);
  const main=useRef<HTMLElement>(null);
  const activeRequest=useRef<string|null>(null);
  const [draft,setDraft]=useState<AnalysisDraft|null>(null);
  const [analysisSession,setAnalysisSession]=useState(0);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[cancelling,setCancelling]=useState(false),[opening,setOpening]=useState(false);
  const [usuario, setUsuario] = useState<{ id: number; nome: string; email: string; perfil?: string } | null>(null);
  const {preferences,update: updatePreferences,saveError}=usePreferences(usuario?.id ?? null);
  const [currentView, setCurrentView] = useState<string>('login');
  const [showCaptureOverlay, setShowCaptureOverlay] = useState<boolean>(false);
  const [capturedOcrText, setCapturedOcrText] = useState<string>('');
  const [currentProcessing, setCurrentProcessing] = useState<{ agenteTipo: string; conteudo: string } | null>(null);
  const [activeResult, setActiveResult] = useState<any>(null);
  const [appIniciado, setAppIniciado] = useState<boolean>(false);
  useEffect(()=>{if(main.current)main.current.scrollTop=0;},[currentView,usuario?.id]);

  useEffect(()=>{
    const native=window.electronAPI;
    if(!native)return;
    void native.setFloatingEnabled(Boolean(usuario) && preferences.floatingButton);
    return native.onFloatingDisabled(()=>updatePreferences({floatingButton:false}));
  },[usuario?.id,preferences.floatingButton]);

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

  const clearSession = () => {
    setDraft(null);setError('');setNotice('');activeRequest.current=null;
    requestId.current++;
    removeAuthToken();
    setUsuario(null);
    setActiveResult(null);
    setCurrentProcessing(null);
    setCapturedOcrText('');
    setShowCaptureOverlay(false);
    setCurrentView('login');
  };

  const cancelPending=async()=>{
    const pending=activeRequest.current;if(!pending)return;
    requestId.current++;setCancelling(true);setError('');
    try{const result=await api.cancelAnalise(pending);setNotice(result.mensagem);}
    catch{setError('Não foi possível confirmar o cancelamento. Consulte o histórico antes de repetir a análise.');}
    finally{activeRequest.current=null;setCurrentProcessing(null);setCancelling(false);}
  };
  const navigate=async(view:string)=>{
    if(cancelling)return;if(activeRequest.current)await cancelPending();
    if(view==='new-analysis'){
      setDraft(previous=>preferences.keepDraft && previous?{...previous,agenteTipo:preferences.defaultAgent}:null);
      setAnalysisSession(value=>value+1);
    }else if(!preferences.keepDraft)setDraft(null);
    requestId.current++;setOpening(false);setActiveResult(null);setCurrentView(view);
  };
  const handleLogout=async()=>{if(cancelling)return;if(activeRequest.current)await cancelPending();clearSession();};
  const handleIniciarAnalise = async (params:AnalysisInput) => {
    setError('');setNotice('');
    const submission=crypto.randomUUID();activeRequest.current=submission;
    const id = ++requestId.current;
    setCurrentProcessing({
      agenteTipo: params.agente_tipo,
      conteudo: params.conteudo || params.url || ''
    });
    setCurrentView('processing');

    try {
      const res = await api.createAnalise({...params,solicitacao_id:submission});
      if (id !== requestId.current) return;
      setActiveResult(res);
      setCurrentView('result');
    } catch (err: any) {
      if (id !== requestId.current) return;
      setError(err.message || 'Não foi possível concluir. Confira os dados e tente novamente.');
      setCurrentView('new-analysis');
    } finally {
      if (id === requestId.current) {activeRequest.current=null;setCurrentProcessing(null);}
    }
  };

  const handleAbrirAnaliseDoHistorico = async (id: number) => {
    const operation = ++requestId.current;
    setActiveResult(null);setOpening(true);setError('');
    try {
      const res = await api.getAnaliseById(id);
      if (operation !== requestId.current) return;
      setActiveResult(res);
      setCurrentView('result');
    } catch (err: any) {
      if (operation !== requestId.current) return;
      setError(err.message || 'Não foi possível abrir a pesquisa. Tente novamente.');
    } finally {if(operation===requestId.current)setOpening(false);}
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
        onNavigate={view=>{void navigate(view);}}
        usuario={usuario}
        onLogout={handleLogout}
      />

      <main ref={main} className="main-content" key={usuario.id}>
        {error && <p role="alert" className="alert-box alert-error">{error}</p>}
        {notice && <p role="status" className="history-notice">{notice}<button className="text-button" onClick={()=>setNotice('')}>Fechar aviso</button></p>}
        {opening && <p role="status">Abrindo pesquisa...</p>}
        {currentView === 'new-analysis' && (
          <NewAnalysisView
            key={analysisSession}
            defaultAgent={preferences.defaultAgent}
            initialDraft={draft} onDraftChange={setDraft}
            onStartAnalysis={handleIniciarAnalise}
            onOpenCapture={() => setShowCaptureOverlay(true)}
          />
        )}

        {currentView === 'ocr-review' && (
          <OCRReviewView
            initialText={capturedOcrText}
            defaultAgent={draft?.agenteTipo || preferences.defaultAgent}
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
            cancelling={cancelling} onCancel={()=>{void navigate('new-analysis');}}
          />
        )}

        {currentView === 'result' && activeResult && (
          <ResultView
            analise={activeResult}
            confirmLinks={preferences.confirmLinks}
            onNewAnalysis={()=>{setDraft(null);void navigate('new-analysis');}}
          />
        )}

        {currentView === 'history' && (
          <HistoryView
            onSelectAnalise={handleAbrirAnaliseDoHistorico}
            onNewAnalysis={()=>{setDraft(null);void navigate('new-analysis');}}
          />
        )}

        {currentView === 'settings' && <SettingsView usuario={usuario} preferences={preferences} onChange={updatePreferences} saveError={saveError} />}
        {currentView === 'admin' && usuario.perfil==='ADMIN' && <AdminView />}

        {currentView === 'help' && <HelpView onNewAnalysis={()=>{setDraft(null);void navigate('new-analysis');}} />}

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
