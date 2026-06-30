import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Tv, Play, Headphones, Info } from 'lucide-react';
import './DesktopSidebar.css';

const DesktopSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/live', label: 'Live TV', icon: Tv },
    { path: '/vod', label: 'Movies & Series', icon: Play },
    { path: '/music', label: 'Music Studio', icon: Headphones },
  ];

  const isActive = (item) => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="desktop-sidebar">
      <div className="sidebar-brand">
        <img
          src="/sakura_logo.png"
          alt="SakuraStream"
          className="sidebar-brand-icon"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <span className="sidebar-brand-text">
          Sakura<span className="accent">Stream</span>
        </span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              className={`sidebar-nav-item ${isActive(item) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <Icon size={20} className="nav-icon" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-nav-item" onClick={() => navigate('/terms')}>
          <Info size={20} className="nav-icon" />
          <span>Terms & Policy</span>
        </button>
      </div>
    </div>
  );
};

export default DesktopSidebar;
