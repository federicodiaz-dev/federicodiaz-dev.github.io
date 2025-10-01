/* =========================================
   CONTACTO — mailto: (sin backend, sin EmailJS)
   - Envía SIEMPRE por email abriendo el cliente de correo
   - Si pref=whatsapp, NO abre WhatsApp: se incluye número y preferencia en el mail
   - Mantiene honeypot, UTM/referrer, accesibilidad y validaciones mínimas
========================================= */
(() => {
  // Cambiá a tu casilla destino:
  const CONTACT_EMAIL = 'federico.diaz.2004@gmail.com';

  const form   = document.getElementById('contactForm');
  const status = document.getElementById('contactStatus');
  if (!form) return;

  // Helpers
  const $   = (s, r = form) => r.querySelector(s);
  const get = (name) => $(`[name="${name}"]`);
  const enc = encodeURIComponent;

  // Mostrar/ocultar campo teléfono si pref = whatsapp
  const phoneWrap = form.querySelector('.fld--phone');
  form.querySelectorAll('input[name="pref"]').forEach(r =>
    r.addEventListener('change', syncPhone, { passive: true })
  );
  function syncPhone() {
    const pref = (form.querySelector('input[name="pref"]:checked') || {}).value;
    const isWa = pref === 'whatsapp';
    phoneWrap.classList.toggle('is-hidden', !isWa);
    get('phone').required = isWa;
  }
  syncPhone();

  // UTM + referrer (atribución básica)
  const qs = new URLSearchParams(location.search);
  const utmKeys = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'];
  const utmPairs = utmKeys.map(k => qs.get(k) ? `${k}=${qs.get(k)}` : '').filter(Boolean);
  if (document.referrer) utmPairs.push(`referrer=${document.referrer}`);
  const utmTrail = utmPairs.length ? utmPairs.join(' | ') : 'direct';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.textContent = '';
    form.setAttribute('aria-busy', 'true');

    // Honeypot anti-spam
    if ((get('company') && get('company').value.trim() !== '')) {
      status.textContent = 'Error: envío inválido.';
      form.removeAttribute('aria-busy');
      status.focus?.();
      return;
    }

    // Campos
    const name     = get('name').value.trim();
    const email    = get('email').value.trim();
    const industry = get('industry').value;
    const budget   = get('budget').value;
    const message  = get('message').value.trim();
    const pref     = (form.querySelector('input[name="pref"]:checked') || {}).value || 'email';
    const phone    = get('phone').value.trim();
    const consent  = get('consent').checked;

    // Validaciones mínimas
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!name || !emailOk || message.length < 20 || !consent) {
      status.textContent = 'Revisá: nombre, email válido, mensaje (20+ carac.) y consentimiento.';
      form.removeAttribute('aria-busy'); status.focus?.(); return;
    }
    if (pref === 'whatsapp' && !phone) {
      status.textContent = 'Ingresá tu número de WhatsApp o elegí contacto por email.';
      form.removeAttribute('aria-busy'); status.focus?.(); return;
    }

    // Asunto y cuerpo (mailto usa CRLF \r\n para compatibilidad)
    const subject = `Consulta web — ${name}`;
    const body =
`Nombre: ${name}\r
Email: ${email}\r
Industria: ${industry}\r
Presupuesto: ${budget}\r
Preferencia de contacto: ${pref}${phone ? ` (${phone})` : ''}\r
\r
Mensaje:\r
${message}\r
\r
— Origen: ${utmTrail}\r
Página: ${location.href}\r
User-Agent: ${navigator.userAgent}`;

    // mailto (evita pop-up blockers al usar navegación directa)
    const url = `mailto:${CONTACT_EMAIL}?subject=${enc(subject)}&body=${enc(body)}`;
    try {
      window.location.href = url;
      status.textContent = 'Abriendo tu cliente de correo…';
      // Limpiamos el formulario para evitar reenvíos accidentales
      form.reset(); syncPhone();
    } catch (err) {
      console.error('Error mailto:', err);
      status.textContent = 'No pudimos abrir tu cliente de correo. Escribinos a ' + CONTACT_EMAIL;
    } finally {
      form.removeAttribute('aria-busy');
      status.focus?.();
    }
  });
})();
