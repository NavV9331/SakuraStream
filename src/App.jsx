import React, { Suspense, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import { useSpatialNavigation } from './hooks/useSpatialNavigation';

// Lazy-loaded pages — only downloaded when the user navigates to them
const Home = React.lazy(() => import('./pages/Home'));
const LiveTV = React.lazy(() => import('./pages/LiveTV'));
const Music = React.lazy(() => import('./pages/Music'));
const Terms = React.lazy(() => import('./pages/Terms'));

const Vod = React.lazy(() => import('./pages/Vod'));

// Minimal loading fallback
const PageLoader = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100%', gap: '16px',
    color: 'var(--text-secondary)'
  }}>
    <div className="spinner" />
    <p>Loading…</p>
  </div>
);

function App() {
  useSpatialNavigation();
  const location = useLocation();
  const navigate = useNavigate();
  const hideNav = location.pathname === '/music';

// Web Layout
  return (
    <>
      {(!hideNav) && <Navbar />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/live" element={<LiveTV />} />
          <Route path="/music" element={<Music />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/vod" element={<Vod />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
