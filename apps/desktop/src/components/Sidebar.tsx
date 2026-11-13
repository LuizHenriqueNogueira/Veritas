import { Icon } from './Icon.js';
import React from 'react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  usuario: { nome: string; email: string; perfil?: string } | null;
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
          <li role="button" tabIndex={0}
            className={`nav-item ${currentView === 'new-analysis' || currentView === 'processing' || currentView === 'result' || currentView === 'ocr-review' ? 'active' : ''}`}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") e.currentTarget.click(); }}
            onClick={() => onNavigate('new-analysis')}
          >
            <span><Icon name="Search" /></span>
            <span>Nova análise</span>
          </li>
          <li role="button" tabIndex={0}
            className={`nav-item ${currentView === 'history' ? 'active' : ''}`}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") e.currentTarget.click(); }}
            onClick={() => onNavigate('history')}
          >
            <span><Icon name="History" /></span>
            <span>Histórico</span>
          </li>
          <li role="button" tabIndex={0}
            className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") e.currentTarget.click(); }}
            onClick={() => onNavigate('settings')}
          >
            <span><Icon name="Settings" /></span>
            <span>Configurações</span>
          </li>
          <li role="button" tabIndex={0}
            className={`nav-item ${currentView === 'help' ? 'active' : ''}`}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") e.currentTarget.click(); }}
            onClick={() => onNavigate('help')}
          >
            <span><Icon name="CircleHelp" /></span>
            <span>Ajuda</span>
          </li>
          {usuario?.perfil==='ADMIN' && <li role="button" tabIndex={0} className={`nav-item ${currentView==='admin'?'active':''}`} onClick={()=>onNavigate('admin')} onKeyDown={e=>{if(e.key==='Enter' || e.key===' ')e.currentTarget.click();}}><Icon name="LockKeyhole"/><span>Administração</span></li>}
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
          <Icon name="LogOut" />
        </button>
      </div>
    </aside>
  );
};
