import { useEffect, useRef } from 'react';

export function useSpatialNavigation() {
  const activeElement = useRef(null);
  
  useEffect(() => {
    const enableTvMode = () => {
      document.body.classList.add('tv-mode');
    };

    // ── Auto-enable TV mode on TV devices ──
    const isTV = false; // TV logic disabled for pure web
    if (isTV) {
      enableTvMode();
      // Auto-focus the first focusable element on load
      setTimeout(() => {
        const els = getFocusable();
        if (els.length > 0) {
          setActive(els[0]);
        }
      }, 500);
    }

    const getFocusable = () => {
      return Array.from(document.querySelectorAll('a[href], button, select, input, [tabindex]:not([tabindex="-1"])'))
        .filter(el => {
          const r = el.getBoundingClientRect();
          return !el.hasAttribute('disabled') && el.offsetParent !== null && r.width > 0 && r.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
        });
    };

    const setActive = (el) => {
      if (activeElement.current) {
        activeElement.current.classList.remove('tv-focus');
      }
      activeElement.current = el;
      el.classList.add('tv-focus');
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    };

    // ── Sound feedback for TV navigation (subtle) ──
    const playNavSound = () => {
      // Only on TV devices — creates a very short, subtle tick
      if (!isTV) return;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 600;
        gain.gain.value = 0.03;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.stop(ctx.currentTime + 0.06);
      } catch (e) { /* ignore if AudioContext unavailable */ }
    };

    const handleKeyDown = (e) => {
      // ── Back button handling (Android TV remote, Escape key) ──
      if (e.key === 'Escape' || e.key === 'GoBack' || e.keyCode === 27 || e.keyCode === 4) {
        // Check if there's a close button or back button visible
        const closeBtn = document.querySelector('.close-btn') || document.querySelector('.btn-back');
        if (closeBtn && closeBtn.offsetParent !== null) {
          e.preventDefault();
          closeBtn.click();
          return;
        }
        // If on a sub-page, navigate back
        if (window.location.pathname !== '/' && window.location.pathname !== '/vod/index.html') {
          e.preventDefault();
          window.history.back();
          return;
        }
        return; // Let default behavior handle (exit app)
      }

      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return;
      enableTvMode();

      if (e.key === 'Enter') {
        if (document.activeElement && document.activeElement.click) {
            // let native click happen
        }
        return;
      }

      e.preventDefault();
      
      const els = getFocusable();
      if (!els.length) return;

      if (!activeElement.current || !document.body.contains(activeElement.current) || activeElement.current !== document.activeElement) {
        activeElement.current = document.activeElement !== document.body ? document.activeElement : els[0];
        if (!activeElement.current) return;
        setActive(activeElement.current);
        return;
      }

      const currentRect = activeElement.current.getBoundingClientRect();
      let best = null;
      let minDistance = Infinity;

      els.forEach(el => {
        if (el === activeElement.current) return;
        const rect = el.getBoundingClientRect();
        let dx = 0, dy = 0, valid = false;

        if (e.key === 'ArrowUp' && rect.bottom <= currentRect.top + 15) {
          dy = currentRect.top - rect.bottom;
          dx = (currentRect.left + currentRect.width / 2) - (rect.left + rect.width / 2);
          valid = true;
        } else if (e.key === 'ArrowDown' && rect.top >= currentRect.bottom - 15) {
          dy = rect.top - currentRect.bottom;
          dx = (currentRect.left + currentRect.width / 2) - (rect.left + rect.width / 2);
          valid = true;
        } else if (e.key === 'ArrowLeft' && rect.right <= currentRect.left + 15) {
          dx = currentRect.left - rect.right;
          dy = (currentRect.top + currentRect.height / 2) - (rect.top + rect.height / 2);
          valid = true;
        } else if (e.key === 'ArrowRight' && rect.left >= currentRect.right - 15) {
          dx = rect.left - currentRect.right;
          dy = (currentRect.top + currentRect.height / 2) - (rect.top + rect.height / 2);
          valid = true;
        }

        if (valid) {
          const dist = Math.sqrt(dx * dx + dy * dy) + (e.key === 'ArrowUp' || e.key === 'ArrowDown' ? Math.abs(dx) * 1.5 : Math.abs(dy) * 1.5);
          if (dist < minDistance) {
            minDistance = dist;
            best = el;
          }
        }
      });

      if (best) {
        setActive(best);
        playNavSound();
      }
    };

    // ── Long-press detection for TV remotes ──
    let longPressTimer = null;
    const handleKeyUp = (e) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
}
