import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';

interface CaptureOverlayProps {
  onCaptureCompleted: (textoExtraido: string) => void;
  onCancel: () => void;
}

export const CaptureOverlay: React.FC<CaptureOverlayProps> = ({
  onCaptureCompleted,
  onCancel
}) => {
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [mensagemStatus, setMensagemStatus] = useState<string>(
    'Capture uma área da tela (Win + Shift + S) e pressione Ctrl+V, ou carregue uma imagem abaixo:'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Escuta evento de Colar (Ctrl + V) para receber imagens da área de transferência
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = event => {
              const base64 = event.target?.result as string;
              setImagemPreview(base64);
              setMensagemStatus('Imagem capturada recebida! Clique no botão abaixo para processar via OCR.');
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        const base64 = event.target?.result as string;
        setImagemPreview(base64);
        setMensagemStatus('Arquivo de imagem carregado! Clique no botão para reconhecer o texto.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessarOCR = async () => {
    if (!imagemPreview) {
      alert('Nenhuma imagem foi selecionada ou colada para o OCR.');
      return;
    }

    setProcessando(true);
    setMensagemStatus('Executando OCR com o motor Tesseract...');

    try {
      // RN11: Valida região selecionada
      await api.capturarRegiao({ x: 0, y: 0, largura: 600, altura: 400 });

      // RN12 e RN15: Envia a imagem em base64 para reconhecimento real e descarte imediato
      const ocrRes = await api.reconhecerTexto(imagemPreview);

      if (ocrRes.sucesso && ocrRes.texto) {
        onCaptureCompleted(ocrRes.texto);
      } else {
        alert(ocrRes.mensagem || 'Nenhum texto legível foi identificado na imagem.');
      }
    } catch (err: any) {
      alert(err.message || 'Falha ao processar o reconhecimento óptico de caracteres.');
    } finally {
      setProcessando(false);
    }
  };

  // Demonstração rápida com texto de teste se o usuário preferir
  const handleUsarExemplo = async () => {
    setProcessando(true);
    try {
      const textoExemplo =
        'ATENÇÃO: Comunicado Urgente sobre Novas Diretrizes.\n' +
        'Pesquisadores identificaram pontos de atenção em conteúdos compartilhados sem verificação prévia.';
      const res = await api.reconhecerTexto(textoExemplo);
      onCaptureCompleted(res.texto);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="capture-modal-backdrop">
      <div className="capture-box" style={{ width: 680, height: 'auto', minHeight: 440, padding: 28 }}>
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📸</div>
          <h3 style={{ fontSize: 20, marginBottom: 6, fontWeight: 700 }}>Ferramenta de Captura e OCR Veritas</h3>
          <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 20 }}>
            {mensagemStatus}
          </p>

          {/* Área de Preview ou Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              height: 220,
              border: '2px dashed #93c5fd',
              borderRadius: 10,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              overflow: 'hidden',
              marginBottom: 20,
              position: 'relative'
            }}
          >
            {imagemPreview ? (
              <img
                src={imagemPreview}
                alt="Captura"
                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 600 }}>Pressione Ctrl+V para colar um print da tela</p>
                <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  ou clique aqui para selecionar uma imagem do computador
                </p>
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: 10,
                    padding: '6px 14px',
                    borderRadius: 6,
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    fontSize: 12
                  }}
                >
                  Dica: use Win + Shift + S no Windows e dê Ctrl+V
                </span>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleUsarExemplo}
              style={{ fontSize: 12, opacity: 0.8 }}
            >
              ⚡ Usar amostra de teste
            </button>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" onClick={onCancel} disabled={processando}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                style={{ width: 'auto', padding: '10px 24px' }}
                onClick={handleProcessarOCR}
                disabled={processando || !imagemPreview}
              >
                {processando ? 'Processando OCR...' : 'Extrair Texto (OCR) ✨'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
