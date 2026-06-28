import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
    const location = useLocation();
    const isHome = location.pathname === '/';
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const rafId = useRef(null);

    useEffect(() => {
        let lastScrolled = false;

        const handleScroll = (e) => {
            // Cancel any pending RAF to avoid stacking
            if (rafId.current) cancelAnimationFrame(rafId.current);

            rafId.current = requestAnimationFrame(() => {
                const target = e?.target;
                const pos = target?.scrollTop ?? window.scrollY ?? document.documentElement.scrollTop ?? 0;
                const nowScrolled = pos > 20;
                // Only update state if the value actually changed
                if (nowScrolled !== lastScrolled) {
                    lastScrolled = nowScrolled;
                    setScrolled(nowScrolled);
                }
            });
        };

        window.addEventListener('scroll', handleScroll, true);
        handleScroll();
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            if (rafId.current) cancelAnimationFrame(rafId.current);
        };
    }, []);

    let navClass = 'navbar ';
    if (isHome) {
        navClass += `navbar-fixed ${scrolled ? 'navbar-scrolled' : ''}`;
    } else {
        navClass += 'navbar-sticky';
    }

    return (
        <nav className={navClass}>
            <div className="navbar-container">
                <NavLink to="/" className="navbar-brand">
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-1px', margin: 0 }}>Sakura<span>Stream.</span></h2>
                    </div>
                </NavLink>

                <div className={`navbar-links ${mobileOpen ? 'navbar-links--open' : ''}`}>
                    <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        onClick={() => setMobileOpen(false)}>
                        Home
                    </NavLink>
                    <a href="/vod/index.html" className="nav-link" onClick={() => setMobileOpen(false)}>
                        Movies & TV
                    </a>
                    <NavLink to="/live" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        onClick={() => setMobileOpen(false)}>
                        Live Channels
                    </NavLink>
                    <NavLink to="/music" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        onClick={() => setMobileOpen(false)}>
                        Music
                    </NavLink>
                </div>

                <button className="navbar-hamburger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
                    {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile overlay backdrop */}
            {mobileOpen && <div className="navbar-mobile-backdrop" onClick={() => setMobileOpen(false)} />}
        </nav>
    );
};

export default Navbar;
