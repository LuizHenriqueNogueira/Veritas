// ========================================================
// Analisador IA - Veritas Desktop
// Cliente HTTP de Comunicação com a API REST Back-End
// ========================================================

const API_BASE = 'http://localhost:3001/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('veritas_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('veritas_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('veritas_token');
}

async function request(path: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.erro || data.error || 'Erro na comunicação com o servidor Veritas.');
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

  // Análises (RN05, RN08, RN25, RN26)
  createAnalise: (body: {
    tipo_entrada: 'TEXTO' | 'CAPTURA_OCR' | 'URL';
    agente_tipo?: string;
    agente_id?: number;
    conteudo?: string;
    url?: string;
  }) => request('/analises', { method: 'POST', body: JSON.stringify(body) }),

  getAnalises: (params?: { agenteId?: number; busca?: string }) => {
    const qs = new URLSearchParams();
    if (params?.agenteId) qs.set('agenteId', String(params.agenteId));
    if (params?.busca) qs.set('busca', params.busca);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/analises${query}`);
  },

  getAnaliseById: (id: number) => request(`/analises/${id}`),

  // OCR (RN10, RN11, RN12, RN13, RN14, RN15)
  iniciarCaptura: () => request('/ocr/iniciar', { method: 'POST' }),
  capturarRegiao: (body: { x: number; y: number; largura: number; altura: number }) =>
    request('/ocr/capturar-regiao', { method: 'POST', body: JSON.stringify(body) }),
  reconhecerTexto: (imagem_ou_texto: string) =>
    request('/ocr/reconhecer', { method: 'POST', body: JSON.stringify({ imagem_ou_texto }) })
};
