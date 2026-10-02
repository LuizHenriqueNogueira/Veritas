import React from 'react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  usuario: { nome: string; email: string } | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  usuario,
  onLogout
}) => {
  return (
    <aside className="sidebar">
      <div>
        <div className="brand-section">
          <div className="brand-logo">V</div>
          <div>
            <div className="brand-title">Veritas</div>
            <div className="brand-subtitle">Mais clareza para um mundo de informações</div>
          </div>
        </div>

        <ul className="nav-menu">
          <li
            className={`nav-item ${currentView === 'new-analysis' || currentView === 'processing' || currentView === 'result' || currentView === 'ocr-review' ? 'active' : ''}`}
            onClick={() => onNavigate('new-analysis')}
          >
            <span>🔍</span>
            <span>Nova análise</span>
          </li>
          <li
            className={`nav-item ${currentView === 'history' ? 'active' : ''}`}
            onClick={() => onNavigate('history')}
          >
            <span>📜</span>
            <span>Histórico</span>
          </li>
          <li
            className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => onNavigate('settings')}
          >
            <span>⚙️</span>
            <span>Configurações</span>
          </li>
          <li
            className={`nav-item ${currentView === 'help' ? 'active' : ''}`}
            onClick={() => onNavigate('help')}
          >
            <span>❓</span>
            <span>Ajuda</span>
          </li>
        </ul>
      </div>

      <div className="user-profile">
        <div className="user-info">
          <div className="user-avatar">
            {usuario?.nome ? usuario.nome.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="user-name">{usuario?.nome || 'Usuário'}</div>
            <div className="user-role">{usuario?.email || 'veritas@sistema'}</div>
          </div>
        </div>
        <button className="btn-logout" title="Sair do sistema" onClick={onLogout}>
          🚪
        </button>
      </div>
    </aside>
  );
};
