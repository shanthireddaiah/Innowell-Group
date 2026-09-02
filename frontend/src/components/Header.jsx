import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Bot, Sparkles } from 'lucide-react';

export default function Header({ title, onToggleChatbot }) {
  const { user, logout } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'I';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <header className="top-header">
      <div className="header-title-area">
        <h1>{title}</h1>
      </div>

      <div className="header-right">
        <button 
          className="btn btn-ai" 
          onClick={onToggleChatbot}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Sparkles size={16} color="#3B82F6" />
          <span>Ask Innowell AI</span>
        </button>

        <div className="user-profile-badge">
          <div className="avatar-circle">
            {getInitials(user?.name)}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-heading)' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-secondary-text)' }}>
              {user?.email}
            </div>
          </div>
        </div>

        <button 
          className="btn btn-secondary" 
          onClick={logout}
          title="Sign Out"
          style={{ padding: '8px 12px' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
