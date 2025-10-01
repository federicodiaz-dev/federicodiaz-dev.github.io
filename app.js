/* =========================================================
   UI base + Animations (SEO/A11y/Perf)
   - Header fijo: sincroniza --header-h y padding-top body
   - Tema persistente (+ sync con SO) + meta theme-color dinámico
   - Anchor focus accesible
   - Copiar email sin CLS (aria-live)
   - Ripple en botones (coordenadas)
   - Reveal on scroll + stagger (IntersectionObserver)
   - Parallax suave (panel del hero)
   - Scrollspy (activa links según sección visible)
   - Estado visual "scrolled" para el header
========================================================= */
(() => {
  const d = document, root = d.documentElement;
  const toggle = d.getElementById('themeToggle');
  const status = d.getElementById('themeStatus');
  const metaTheme = Array.from(d.querySelectorAll('meta[name="theme-color"]'));
  const prefersReduced = matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Ajuste de --header-h y padding del body ---------- */
  (function syncHeaderOffset(){
    const header = d.querySelector('.site-header');
    if (!header) return;

    const apply = () => {
      const h = header.offsetHeight || 64;
      root.style.setProperty('--header-h', h + 'px');
      d.body.style.paddingTop = h + 'px';
    };

    // inicio
    apply();

    // resize/orientation
    let raf;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };
    window.addEventListener('resize', onResize, { passive: true });

    // fuentes/recursos
    window.addEventListener('load', apply, { once: true, passive: true });
  })();

  /* ---------- Tema ---------- */
  const getStored = () => { try { return localStorage.getItem('theme'); } catch { return null; } };
  const setStored = v => { try { localStorage.setItem('theme', v); } catch {} };

  function applyTheme(mode, persist = true) {
    root.setAttribute('data-theme', mode);
    if (persist) setStored(mode);
    toggle?.setAttribute('aria-pressed', String(mode === 'dark'));
    toggle?.setAttribute('aria-label', mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    status && (status.textContent = mode === 'dark' ? 'Modo oscuro' : 'Modo claro');
    metaTheme.forEach(m => { if (!m.media) m.setAttribute('content', mode === 'dark' ? '#0B1220' : '#FFFFFF'); });
  }
  const stored = getStored();
  const prefersDark = matchMedia?.('(prefers-color-scheme: dark)').matches;
  applyTheme(stored || (prefersDark ? 'dark' : (root.getAttribute('data-theme') || 'light')), false);

  toggle?.addEventListener('click', () => {
    applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  }, { passive: true });

  if (!stored && window.matchMedia) {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', e => applyTheme(e.matches ? 'dark' : 'light', false));
  }

  /* ---------- Anchor focus accesible ---------- */
  (window.requestIdleCallback || (cb => setTimeout(cb, 1)))(() => {
    d.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', () => {
        const id = a.getAttribute('href').slice(1);
        const target = d.getElementById(id);
        if (!target) return;
        requestAnimationFrame(() => {
          const t = target.querySelector('h1,h2,h3,h4,h5,h6') || target;
          if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
          t.focus({ preventScroll: true });
        });
      }, { passive: true });
    });
  });

  /* ---------- Copiar email (sin CLS) ---------- */
  (window.requestIdleCallback || (cb => setTimeout(cb, 1)))(() => {
    const btn = d.querySelector('.copy'); if (!btn) return;
    const live = d.createElement('span'); live.className = 'visually-hidden'; live.setAttribute('aria-live', 'polite');
    btn.after(live);
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy || '';
      const w = btn.getBoundingClientRect().width; btn.style.minWidth = w + 'px';
      try{ await navigator.clipboard.writeText(text); live.textContent = 'Email copiado'; btn.classList.add('is-copied'); }
      catch{ live.textContent = 'Copiá este email:'; alert(text); }
      finally{ setTimeout(() => { btn.style.minWidth = ''; btn.classList.remove('is-copied'); live.textContent = ''; }, 1400); }
    }, { passive: true });
  });

  /* ---------- Ripple: posiciona el centro en el clic ---------- */
  d.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn'); if (!b) return;
    const rect = b.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    b.style.setProperty('--rx', x + '%');
    b.style.setProperty('--ry', y + '%');
  }, { capture: true });

  /* ---------- Animaciones “reveal” + stagger ---------- */
  function setupReveals(){
    if (prefersReduced || !('IntersectionObserver' in window)) return;

    // Auto-asigna animación a varios elementos si no la tienen
    const autoTargets = d.querySelectorAll(`
      [data-anim],
      .card, .gcard, .process__item, .kpi, .aside__box, .contact__form, .panel,
      .metric, .footer__brand, .footer__nav, .footer__contact
    `);

    autoTargets.forEach(el => {
      el.classList.add('will-animate');
      if (!el.hasAttribute('data-anim')) el.setAttribute('data-anim','fade-up');
    });

    // Stagger por contenedor
    d.querySelectorAll('[data-stagger], .cards__grid, .process__list, .guars__grid, .roi__results').forEach(group => {
      Array.from(group.children).forEach((child, i) => {
        child.style.setProperty('--d', `${Math.min(i * 80, 800)}ms`);
      });
    });

    const io = new IntersectionObserver((entries, obs) => {
      for (const it of entries){
        if (it.isIntersecting){
          it.target.classList.add('in-view');
          obs.unobserve(it.target);
        }
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    autoTargets.forEach(el => io.observe(el));
  }
  setupReveals();

  /* ---------- Parallax suave (panel del hero, si existe) ---------- */
  function setupParallax(){
    if (prefersReduced) return;
    const el = d.querySelector('.hero .panel');
    if (!el) return;
    let ticking = false;
    function onScroll(){
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const { top, height } = el.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        const p = Math.min(1, Math.max(0, 1 - (top + height*0.5) / (vh + height)));
        // Mueve sutilmente hacia arriba (máx 12px)
        el.style.transform = `translateY(${(-12 * p).toFixed(2)}px)`;
        ticking = false;
      });
    }
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  setupParallax();

  /* ---------- Scrollspy (activa link) ---------- */
  function setupSpy(){
    const links = Array.from(d.querySelectorAll('.nav__link[href^="#"]'));
    const ids = links.map(a => a.getAttribute('href').slice(1));
    const sections = ids.map(id => d.getElementById(id)).filter(Boolean);
    if (!sections.length) return;

    const spy = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const id = entry.target.id;
        const link = links.find(a => a.getAttribute('href') === `#${id}`);
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach(l => l.classList.remove('is-active'));
          link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0.01 });

    sections.forEach(s => spy.observe(s));
  }
  setupSpy();

  /* ---------- Header “scrolled” ---------- */
  let lastY = 0;
  addEventListener('scroll', () => {
    const y = scrollY || d.documentElement.scrollTop;
    if ((y > 6) !== (lastY > 6)) d.body.classList.toggle('scrolled', y > 6);
    lastY = y;
  }, { passive: true });
})();
