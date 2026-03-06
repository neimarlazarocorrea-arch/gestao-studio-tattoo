// helper compartilhado para consumir API no contrato { ok, data, error }
(function () {
  const TOAST_CONTAINER_ID = 'app-toast-container';
  const MAX_TOASTS = 4;

  async function apiRequest(url, options) {
    const res = await fetch(url, options || {});
    const text = await res.text();
    let body = null;

    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    const hasContract = body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'ok');
    const ok = hasContract ? !!body.ok : res.ok;
    const data = hasContract ? body.data : body;
    const error = hasContract ? body.error : (!res.ok ? (body && body.error) || null : null);

    if (!ok) {
      const err = new Error(error || `HTTP ${res.status}`);
      err.status = res.status;
      err.payload = body;
      throw err;
    }

    return data;
  }

  function formatUiError(err, fallback, prefix) {
    const raw = err && typeof err.message === 'string' ? err.message.trim() : '';
    const base = raw || fallback || 'Erro inesperado';
    const p = prefix || 'Falha';
    return `${p}: ${base}`;
  }

  function ensureToastContainer() {
    let container = document.getElementById(TOAST_CONTAINER_ID);
    if (container) return container;

    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    container.style.position = 'fixed';
    container.style.top = '16px';
    container.style.right = '16px';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';
    container.style.maxWidth = '360px';
    document.body.appendChild(container);
    return container;
  }

  function notify(message, type, duration) {
    const text = String(message || '').trim();
    if (!text) return;

    if (!document || !document.body) {
      alert(text);
      return;
    }

    const toastType = type || 'info';
    const ttl = typeof duration === 'number' ? duration : 3800;
    const palette = {
      success: { bg: '#1f8f4e', border: '#2ecc71' },
      error: { bg: '#8f2f2f', border: '#e74c3c' },
      warning: { bg: '#8a6d1f', border: '#f39c12' },
      info: { bg: '#2d3642', border: '#7f8c8d' }
    };

    const colors = palette[toastType] || palette.info;
    const container = ensureToastContainer();

    while (container.children.length >= MAX_TOASTS) {
      container.firstElementChild.remove();
    }

    const toast = document.createElement('div');
    const content = document.createElement('div');
    const closeBtn = document.createElement('button');
    content.textContent = text;
    closeBtn.type = 'button';
    closeBtn.textContent = 'x';
    closeBtn.setAttribute('aria-label', 'Fechar notificacao');
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#ffffff';
    closeBtn.style.fontSize = '14px';
    closeBtn.style.lineHeight = '1';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.padding = '0 0 0 8px';
    closeBtn.style.opacity = '0.85';

    toast.style.display = 'flex';
    toast.style.alignItems = 'flex-start';
    toast.style.justifyContent = 'space-between';
    toast.style.gap = '8px';
    toast.style.background = colors.bg;
    toast.style.border = `1px solid ${colors.border}`;
    toast.style.color = '#ffffff';
    toast.style.padding = '10px 12px';
    toast.style.borderRadius = '6px';
    toast.style.boxShadow = '0 6px 18px rgba(0,0,0,0.25)';
    toast.style.fontSize = '13px';
    toast.style.lineHeight = '1.35';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-4px)';
    toast.style.transition = 'opacity 140ms ease, transform 140ms ease';

    toast.appendChild(content);
    toast.appendChild(closeBtn);

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    let timeoutId = null;
    let remaining = ttl;
    let startAt = Date.now();

    function dismiss() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-4px)';
      setTimeout(() => toast.remove(), 170);
    }

    function schedule(ms) {
      startAt = Date.now();
      timeoutId = setTimeout(dismiss, ms);
    }

    function pause() {
      if (!timeoutId) return;
      clearTimeout(timeoutId);
      timeoutId = null;
      remaining -= Date.now() - startAt;
    }

    function resume() {
      if (timeoutId) return;
      if (remaining <= 0) {
        dismiss();
        return;
      }
      schedule(remaining);
    }

    closeBtn.addEventListener('click', dismiss);
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.opacity = '1';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.opacity = '0.85';
    });

    toast.addEventListener('mouseenter', pause);
    toast.addEventListener('mouseleave', resume);

    schedule(ttl);
  }

  window.apiRequest = apiRequest;
  window.formatUiError = formatUiError;
  window.notify = notify;
})();
