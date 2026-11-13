import React, { useEffect, useRef, useState } from 'react';
import { ScanLine, Upload, X, Info } from 'lucide-react';
import { api } from '../api.js';

interface Props { onCaptureCompleted: (text: string) => void; onCancel: () => void }
export const CaptureOverlay: React.FC<Props> = ({ onCaptureCompleted, onCancel }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Capture uma região da tela, cole uma imagem ou selecione um arquivo.');
  const input = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const load = async (file: Blob) => {
    setError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 6 * 1024 * 1024) {
      setError('Selecione PNG, JPEG ou WebP de até 6 MB.'); return;
    }
    const reader = new FileReader();
    reader.onerror = () => setError('Não foi possível abrir a imagem.');
    reader.onload = () => { if (alive.current) { setPreview(String(reader.result)); setStatus('Imagem pronta. Confira a prévia e extraia o texto.'); } };
    reader.readAsDataURL(file);
  };
  useEffect(() => {
    const paste = (e: ClipboardEvent) => {
      if (busy) return;
      const image = Array.from(e.clipboardData?.items || []).find(item => item.type.startsWith('image/'))?.getAsFile();
      if (image) { e.preventDefault(); void load(image); }
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('paste', paste); window.addEventListener('keydown', key);
    return () => { window.removeEventListener('paste', paste); window.removeEventListener('keydown', key); };
  }, [busy, onCancel]);
  const capture = async () => {
    setBusy(true); setError('');
    try {
      const image = await window.electronAPI!.captureScreen();
      if (image) { setPreview(image); setStatus('Região capturada. Confira a prévia antes de extrair o texto.'); }
    } catch { setError('Não foi possível capturar a tela. Use Win + Shift + S e cole com Ctrl + V, ou carregue uma imagem.'); }
    finally { setBusy(false); }
  };
  const recognize = async () => {
    if (!preview) return;
    setBusy(true); setError(''); setStatus('Reconhecendo texto em português e inglês...');
    try {
      const image = new Image(); image.src = preview; await image.decode();
      if (image.width * image.height > 16000000) throw new Error('Imagem muito grande. Selecione uma região menor (até 16 megapixels).');
      // Usa as dimensões reais da imagem, sem depender de uma chamada anterior.
      await api.capturarRegiao({ x: 0, y: 0, largura: image.width, altura: image.height });
      const result = await api.reconhecerTexto(preview);
      if (alive.current) { setPreview(null); onCaptureCompleted(result.texto); }
    } catch (err) { if (alive.current) { setError((err as Error).message); setStatus('A imagem continua disponível para nova tentativa.'); } }
    finally { if (alive.current) setBusy(false); }
  };
  return <div className="capture-modal-backdrop">
    <section className="capture-box" role="dialog" aria-modal="true" aria-labelledby="capture-title">
      <header className="capture-title"><div><ScanLine size={22} /><h2 id="capture-title">Captura de texto</h2></div><button className="icon-button" aria-label="Fechar captura" onClick={onCancel} disabled={busy}><X /></button></header>
      <p role="status" className="capture-status">{status}</p>
      {error && <div className="alert-box alert-error" role="alert">{error}</div>}
      <button className="capture-preview" onClick={() => input.current?.click()} disabled={busy}>
        {preview ? <img src={preview} alt="Prévia da região que será reconhecida" /> : <><Upload size={32} /><strong>Cole uma imagem com Ctrl + V</strong><span>ou clique para escolher um arquivo</span><small>PNG, JPEG ou WebP • Até 6 MB</small></>}
      </button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void load(f); e.target.value = ''; }} />
      <p className="capture-tip"><Info size={15} /> No Windows, Win + Shift + S permite selecionar qualquer região para colar aqui.</p>
      <footer className="capture-actions">
        {window.electronAPI?.isDesktop && <button className="btn-secondary" onClick={capture} disabled={busy}><ScanLine size={16} /> Selecionar região da tela</button>}
        <button className="btn-secondary" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button className="btn-primary" onClick={recognize} disabled={busy || !preview}>{busy ? 'Processando...' : 'Extrair texto'}</button>
      </footer>
    </section>
  </div>;
};
