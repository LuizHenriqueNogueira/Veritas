import React, { useState } from 'react';
import { api, setAuthToken } from '../api.js';

interface RegisterViewProps {
  onSuccess: (user: any) => void;
  onGoToLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onSuccess, onGoToLogin }) => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (senha !== confirmarSenha) {
      setErro('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    if (senha.length < 6) {
      setErro('A senha deve possuir pelo menos 6 caracteres.');
      return;
    }

    setCarregando(true);
    try {
      const res = await api.register({ nome, email, senha });
      setAuthToken(res.token);
      onSuccess(res.usuario);
    } catch (err: any) {
      setErro(err.message || 'Erro ao criar conta.');
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
          <p style={{ marginTop: 8, opacity: 0.9 }}>Junte-se à plataforma de análise inteligente.</p>

          <div className="auth-hero-features">
            <div className="feature-pill">
              🛡️ Análise especializada de links suspeitos e golpes.
            </div>
            <div className="feature-pill">
              📸 Ferramenta integrada de captura de tela e OCR.
            </div>
            <div className="feature-pill">
              📁 Histórico seguro de verificações individuais.
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-container">
        <div className="auth-form-card">
          <h2>Crie sua conta</h2>
          <p>Preencha os dados abaixo para começar a usar o Veritas.</p>

          {erro && <div className="alert-box alert-error">{erro}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nome completo</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="Digite seu nome completo"
                value={nome}
                onChange={e => setNome(e.target.value)}
              />
            </div>

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
              <input
                type="password"
                required
                className="form-input"
                placeholder="Crie uma senha segura (mín. 6 dígitos)"
                value={senha}
                onChange={e => setSenha(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Confirmar senha</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="Digite novamente sua senha"
                value={confirmarSenha}
                onChange={e => setConfirmarSenha(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={carregando}>
              {carregando ? 'Cadastrando...' : 'Criar conta'}
            </button>
          </form>

          <div className="auth-switch">
            Já tem uma conta?{' '}
            <span className="auth-link" onClick={onGoToLogin}>
              Entrar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
