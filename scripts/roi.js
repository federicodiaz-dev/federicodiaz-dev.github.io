// ===============================
// Calculadora de ROI (SEO/Perf/A11y)
// - Animación count-up respetando reduced-motion
// - Relleno del slider con gradiente dinámico (sin depender del CSS)
// - Formateador ARS; fácil de cambiar de moneda
// ===============================
(() => {
  const $ = (s, r = document) => r.querySelector(s);

  const form = $('#roiForm');
  if (!form) return;

  const hoursPerWeek = $('#hoursPerWeek');
  const hourlyRate   = $('#hourlyRate');
  const autoPct      = $('#autoPct');
  const autoPctOut   = $('#autoPctOut');
  const projectCost  = $('#projectCost');

  const monthlySaving = $('#monthlySaving');
  const yearlySaving  = $('#yearlySaving');
  const paybackOut    = $('#payback');

  const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  // Slider: % y gradiente de relleno
  function updateSliderFill() {
    const p = clamp(parseFloat(autoPct.value) || 0, 0, 100);
    autoPctOut.value = `${p}%`;
    // Gradiente directo (mejor compatibilidad cross-browser)
    autoPct.style.background = `linear-gradient(90deg, var(--brand) ${p}%, var(--border) ${p}%)`;
  }

  function calculate() {
    const h  = Math.max(0, parseFloat(hoursPerWeek.value) || 0);
    const r  = Math.max(0, parseFloat(hourlyRate.value)   || 0);
    const p  = clamp(parseFloat(autoPct.value) || 0, 0, 100) / 100;
    const pc = Math.max(0, parseFloat(projectCost.value)  || 0);

    const weeklySaving = h * r * p;
    const monthly = weeklySaving * 4.33;
    const yearly  = monthly * 12;
    const paybackMonths = monthly > 0 ? (pc / monthly) : null;

    renderNumber(monthlySaving, monthly);
    renderNumber(yearlySaving,  yearly);
    paybackOut.textContent = (paybackMonths && isFinite(paybackMonths)) ? `${paybackMonths.toFixed(1)} meses` : '—';
  }

  // Animación “count-up” con respeto a reduced-motion
  let animId = null;
  function renderNumber(el, target) {
    if (prefersReduced) { el.textContent = fmt.format(Math.max(0, target)); return; }

    if (animId) cancelAnimationFrame(animId);
    const startRaw = parseFloat(el.dataset.rawValue || '0');
    const start = isFinite(startRaw) ? startRaw : 0;
    const end = Math.max(0, target);
    const dur = 420;
    const t0 = performance.now();

    function tick(now) {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const val = start + (end - start) * e;
      el.textContent = fmt.format(val);
      el.dataset.rawValue = val;
      if (t < 1) animId = requestAnimationFrame(tick);
    }
    animId = requestAnimationFrame(tick);
  }

  [hoursPerWeek, hourlyRate, autoPct, projectCost].forEach(inp => {
    inp.addEventListener('input', () => {
      if (inp === autoPct) updateSliderFill();
      calculate();
    }, { passive: true });
  });

  // Init
  updateSliderFill();
  calculate();
})();
