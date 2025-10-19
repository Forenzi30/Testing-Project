/* Minimal UI helpers: scroll-reveal (stagger), ripple, smooth anchors, hero text helper */
(function(){
  'use strict';
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Scroll reveal with optional stagger: elements with .reveal or containers with .stagger-reveal */
  function initReveal() {
    if (prefersReduced) {
      // make everything visible immediately
      document.querySelectorAll('.reveal, .stagger-reveal > *').forEach(el => el.classList.add('visible'));
      return;
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        if (el.classList.contains('stagger-reveal')) {
          const children = Array.from(el.children);
          const delay = parseInt(el.dataset.delay || 100, 10);
          children.forEach((child, i) => {
            child.style.transitionDelay = `${i * delay}ms`;
            child.classList.add('visible');
          });
        } else {
          el.classList.add('visible');
        }
        obs.unobserve(el);
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal, .stagger-reveal').forEach(el => io.observe(el));
  }

  /* Ripple effect for buttons (add class .btn-ripple on elements you want) */
  function initRipple() {
    document.addEventListener('pointerdown', function(e) {
      const btn = e.target.closest('.btn-ripple, .nav-btn, .cta, .order-btn, .btn-soft');
      if (!btn) return;
      // skip if touch-action none etc.
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size/2}px`;
      ripple.style.top = `${e.clientY - rect.top - size/2}px`;
      btn.appendChild(ripple);
      // remove after animation
      ripple.addEventListener('animationend', () => ripple.remove());
    }, { passive: true });
  }

  /* Smooth anchor scrolling (respect reduced motion) */
  function initSmoothAnchors() {
    if (prefersReduced) return;
    document.addEventListener('click', function(e) {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState && history.pushState(null, '', `#${id}`);
      }
    });
  }

  /* Expose small helper for hero content (call when slide changes) */
  function heroShowTextOnce(rootEl) {
    if (!rootEl) return;
    rootEl.querySelectorAll('.hero-content').forEach(h => h.classList.add('visible'));
  }

  // init on DOM ready
  document.addEventListener('DOMContentLoaded', function(){
    try {
      initReveal();
      initRipple();
      initSmoothAnchors();
      // Example: make hero content visible if hero exists
      const hero = document.getElementById('hero');
      if (hero) {
        // Trigger with slight delay so hero images can paint
        setTimeout(()=> hero.querySelectorAll('.hero-content').forEach(h=>h.classList.add('visible')), 300);
      }
    } catch (err) {
      // fail silently
      console.error('UI init error', err);
    }
  });

  // Export small API
  window.__UI = {
    revealNow: initReveal,
    heroShowText: heroShowTextOnce
  };
})();
