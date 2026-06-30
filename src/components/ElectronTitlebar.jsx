import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Minus, Square, X, Maximize2, Search, ArrowLeft } from 'lucide-react';

/**
 * ElectronTitlebar — Native Windows Titlebar
 * Only rendered in Electron. Provides window controls and drag area.
 */
const ElectronTitlebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    window.electronAPI?.isMaximized?.().then(setIsMaximized);
    window.electronAPI?.onWindowStateChange?.((state) => {
      if (state.isMaximized !== undefined) setIsMaximized(state.isMaximized);
      if (state.isFullScreen !== undefined) {
        document.body.classList.toggle('is-fullscreen', state.isFullScreen);
      }
    });
  }, []);

  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();

  return (
    <div className="electron-titlebar">
      {/* Sleek App Branding */}
      <div className="titlebar-brand">
        <h2 style={{ 
          fontSize: '1.1rem', 
          fontWeight: 800, 
          letterSpacing: '-0.5px', 
          margin: 0,
          color: 'var(--text-primary)',
          cursor: 'pointer',
          WebkitAppRegion: 'no-drag'
        }} onClick={() => navigate('/')}>
          Sakura<span style={{
            background: 'var(--accent-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
            fontWeight: 700
          }}>Stream.</span>
        </h2>
      </div>

      {/* Compact Navigation Links */}
      <div className="titlebar-nav" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {location.pathname === '/vod' && (
          <button 
            className="titlebar-nav-chip" 
            style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(255,255,255,0.1)' }}
            onClick={() => {
              const iframe = document.querySelector('iframe[title="Movies & TV"]');
              if (iframe && iframe.contentWindow) iframe.contentWindow.history.back();
            }} 
            title="Go Back"
          >
            <ArrowLeft size={12} /> Back
          </button>
        )}
        <button className={`titlebar-nav-chip ${location.pathname === '/' ? 'active' : ''}`} onClick={() => navigate('/')}>Home</button>
        <button className={`titlebar-nav-chip ${location.pathname === '/vod' ? 'active' : ''}`} onClick={() => {
            if (location.pathname === '/vod') {
                const iframe = document.querySelector('iframe[title="Movies & TV"]');
                if (iframe && iframe.contentWindow) iframe.contentWindow.location.hash = '#/';
            } else {
                navigate('/vod');
            }
        }}>Movies & TV</button>
        <button className={`titlebar-nav-chip ${location.pathname === '/live' ? 'active' : ''}`} onClick={() => navigate('/live')}>Live TV</button>
        <button className={`titlebar-nav-chip ${location.pathname === '/music' ? 'active' : ''}`} onClick={() => navigate('/music')}>Music</button>
      </div>

      {/* Window Controls */}
      <div className="titlebar-controls">
        {location.pathname === '/vod' && (
            <button className="titlebar-btn" onClick={() => {
              const iframe = document.querySelector('iframe[title="Movies & TV"]');
              if (iframe && iframe.contentWindow) iframe.contentWindow.location.hash = '#/search';
            }} title="Search Movies & TV">
              <Search size={14} />
            </button>
        )}
        <button className="titlebar-btn" onClick={handleMinimize} title="Minimize">
          <Minus size={14} />
        </button>
        <button className="titlebar-btn" onClick={handleMaximize} title={isMaximized ? 'Restore' : 'Maximize'}>
          {isMaximized ? <Square size={11} /> : <Maximize2 size={13} />}
        </button>
        <button className="titlebar-btn titlebar-btn--close" onClick={handleClose} title="Close">
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default ElectronTitlebar;
