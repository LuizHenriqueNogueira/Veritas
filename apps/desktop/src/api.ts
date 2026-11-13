/// <reference types="vite/client" />
// ========================================================
// Analisador IA - Veritas Desktop
// Cliente HTTP de Comunicação com a API REST Back-End
// ========================================================

import { invalidateSession, isCurrentSession, sessionSnapshot, SessionChangedError } from './session.js';
async function apiBase() {
  return window.electronAPI?.backendUrl ? window.electronAPI.backendUrl() : import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
}

export function getAuthToken(): string | null {
  return localStorage.getItem('veritas_token');
}

export function setAuthToken(token: string): void {
  invalidateSession();
  localStorage.setItem('veritas_token', token);
}

export function removeAuthToken(): void {
  invalidateSession();
  localStorage.removeItem('veritas_token');
}

async function request(path: string, options: RequestInit = {}) {
  const session = sessionSnapshot();
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const base = await apiBase();
  if (!isCurrentSession(session)) throw new SessionChangedError();
  let res: Response;
  try { res = await fetch(`${base}${path}`, {
    ...options,
    headers, signal: options.signal ? AbortSignal.any([session.signal,options.signal]) : session.signal
  }); } catch (error) { if (!isCurrentSession(session)) throw new SessionChangedError(); throw new Error('Não foi possível conectar ao Veritas. Confira se o aplicativo está aberto e tente novamente. Seus dados de entrada foram mantidos.'); }

  const data = await res.json();
  if (!isCurrentSession(session) || token !== getAuthToken()) throw new SessionChangedError();
  if (!res.ok) {
    throw new Error(data.mensagem || data.erro || data.error || 'Erro na comunicação com o servidor Veritas.');
  }

  return data;
}

export const api = {
  // Autenticação (RN01, RN02, RN03)
  register: (body: { nome: string; email: string; senha: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; senha: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  me: () => request('/auth/me'),

  // Agentes
  getAgentes: () => request('/agentes'),
  getConfiguracaoIA: () => request('/agentes/configuracao'),
  atualizarBaseLinks: () => request('/agentes/reputacao/atualizar', { method: 'POST' }),

  // Análises (RN05, RN08, RN25, RN26)
  createAnalise: (body: {
    contexto?:string;
    solicitacao_id?:string;
    tipo_entrada: 'TEXTO' | 'CAPTURA_OCR' | 'URL';
    agente_tipo?: string;
    agente_id?: number;
    termos_busca?: string;
    conteudo?: string;
    url?: string;
  }) => request('/analises', { method: 'POST', body: JSON.stringify(body) }),

  getAnalises: (params?: { agenteId?: number; busca?: string;excluidas?:boolean }) => {
    const qs = new URLSearchParams();
    if (params?.agenteId) qs.set('agenteId', String(params.agenteId));
    if (params?.busca) qs.set('busca', params.busca);
    if(params?.excluidas)qs.set('excluidas','true');
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/analises${query}`);
  },

  getAnaliseById: (id: number) => request(`/analises/${id}`),
  deleteAnalise:(id:number)=>request(`/analises/${id}`,{method:'DELETE'}),
  restoreAnalise:(id:number)=>request(`/analises/${id}/restaurar`,{method:'POST'}),
  getFeedback:(id:number)=>request(`/analises/${id}/feedback`),
  saveFeedback:(id:number,body:{util:boolean;comentario:string})=>request(`/analises/${id}/feedback`,{method:'PUT',body:JSON.stringify(body)}),
  cancelAnalise:(id:string)=>request('/analises/cancelar',{method:'POST',body:JSON.stringify({solicitacao_id:id}),signal:AbortSignal.timeout(10000)}),

  // OCR (RN10, RN11, RN12, RN13, RN14, RN15)
  iniciarCaptura: () => request('/ocr/iniciar', { method: 'POST' }),
  capturarRegiao: (body: { x: number; y: number; largura: number; altura: number }) =>
    request('/ocr/capturar-regiao', { method: 'POST', body: JSON.stringify(body) }),
  reconhecerTexto: (imagem_ou_texto: string) =>
    request('/ocr/reconhecer', { method: 'POST', body: JSON.stringify({ imagem_ou_texto }) })
};
