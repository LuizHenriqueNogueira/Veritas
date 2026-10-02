import React, { useState } from 'react';
import { api } from '../api.js';

interface CaptureOverlayProps {
  onCaptureCompleted: (textoExtraido: string) => void;
  onCancel: () => void;
}

export const CaptureOverlay: React.FC<CaptureOverlayProps> = ({
  onCaptureCompleted,
  onCancel
}) => {
  const [selecionando, setSelecionando] = useState(false);
  const [coords, setCoords] = useState({ x: 120, y: 80, largura: 520, altura: 240 });
  const [processando, setProcessando] = useState(false);

  const handleConfirmarCaptura = async () => {
    setProcessando(true);
    try {
      // RN11: Valida região selecionada
      await api.capturarRegiao(coords);

      // Simulação do texto capturado da área para OCR (RN12)
      const textoExemploCapturado =
        'A inteligência artificial tem se tornado uma das tecnologias mais influentes da atualidade. ' +
        'No entanto, surgem desafios relacionados à veracidade das informações e proliferação de conteúdos não verificados.';

      const ocrRes = await api.reconhecerTexto(textoExemploCapturado);
      onCaptureCompleted(ocrRes.texto);
    } catch (err: any) {
      alert(err.message || 'Falha ao processar OCR da imagem.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="capture-modal-backdrop">
      <div className="capture-box">
        <div style={{ position: 'absolute', top: 12, left: 16, fontSize: 13, color: '#93c5fd' }}>
          Área selecionada: {coords.largura} x {coords.altura} px
        </div>

        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
          <h3 style={{ fontSize: 18, marginBottom: 6 }}>Modo de Captura de Tela Ativo</h3>
          <p style={{ fontSize: 13, opacity: 0.85, maxWidth: 420 }}>
            Selecione a região com o conteúdo textual que você deseja que o Veritas reconheça via OCR.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button className="btn-secondary" onClick={onCancel} disabled={processando}>
            Cancelar captura
          </button>
          <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }} onClick={handleConfirmarCaptura} disabled={processando}>
            {processando ? 'Processando OCR...' : 'Extrair texto (OCR)'}
          </button>
        </div>
      </div>
    </div>
  );
};
