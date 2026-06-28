import { useEffect, useRef } from 'react';

export function useSpatialNavigation() {
  const activeElement = useRef(null);
  
  useEffect(() => {
    const enableTvMode = () => {
      document.body.classList.add('tv-mode');
    };

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

    const handleKeyDown = (e) => {
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

      if (best) setActive(best);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
