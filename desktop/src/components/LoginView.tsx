import React, { useState } from 'react';
import { api, setAuthToken } from '../api.js';

interface LoginViewProps {
  onSuccess: (user: any) => void;
  onGoToRegister: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess, onGoToRegister }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const res = await api.login({ email, senha });
      setAuthToken(res.token);
      onSuccess(res.usuario);
    } catch (err: any) {
      setErro(err.message || 'Erro ao realizar login.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-hero">
        <div className="auth-hero-card">
          <div className="brand-logo" style={{ width: 64, height: 64, fontSize: 36, marginBottom: 20 }}>
            V
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800 }}>Veritas</h1>
          <p style={{ marginTop: 8, opacity: 0.9 }}>Mais clareza para um mundo de informações.</p>

          <div className="auth-hero-features">
            <div className="feature-pill">
              🔍 <strong>Analise:</strong> Textos, links e conteúdos capturados da tela.
            </div>
            <div className="feature-pill">
              🛡️ <strong>Identifique:</strong> Possíveis sinais de desinformação, fraude e links suspeitos.
            </div>
            <div className="feature-pill">
              💡 <strong>Decida:</strong> Com mais informação e segurança antes de compartilhar.
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-container">
        <div className="auth-form-card">
          <h2>Bem-vindo de volta!</h2>
          <p>Faça login para acessar o Veritas e continuar suas análises.</p>

          {erro && <div className="alert-box alert-error">{erro}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>E-mail</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="Digite seu e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={verSenha ? 'text' : 'password'}
                  required
                  className="form-input"
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setVerSenha(!verSenha)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  {verSenha ? '👁️' : '🔒'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={carregando}>
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="auth-switch">
            Ainda não tem uma conta?{' '}
            <span className="auth-link" onClick={onGoToRegister}>
              Criar conta
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
