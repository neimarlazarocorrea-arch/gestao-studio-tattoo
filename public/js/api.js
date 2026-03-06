// helper compartilhado para consumir API no contrato { ok, data, error }
(function () {
  const TOAST_CONTAINER_ID = 'app-toast-container';
  const MAX_TOASTS = 4;
  const AUTH_STORAGE_KEY = 'tattoo_api_basic_auth';
  const AUTH_CHANGED_EVENT = 'api-auth-changed';
  let authPromptInFlight = null;

  function emitAuthChanged() {
    if (!window || typeof window.dispatchEvent !== 'function') return;
    window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, {
      detail: { hasAuth: !!readAuthToken() }
    }));
  }

  function readAuthToken() {
    try {
      return localStorage.getItem(AUTH_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  }

  function writeAuthToken(token) {
    try {
      if (!token) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        emitAuthChanged();
        return;
      }
      localStorage.setItem(AUTH_STORAGE_KEY, token);
      emitAuthChanged();
    } catch {
      // ignore storage errors
    }
  }

  function applyAuthHeader(options) {
    const opts = options ? { ...options } : {};
    const headers = opts.headers ? { ...opts.headers } : {};
    const token = readAuthToken();
    if (token && !headers.Authorization) {
      headers.Authorization = `Basic ${token}`;
    }
    opts.headers = headers;
    return opts;
  }

  async function promptApiLoginIfNeeded() {
    if (typeof window.loginApiAuthInteractive !== 'function') return false;

    if (!authPromptInFlight) {
      authPromptInFlight = Promise.resolve(window.loginApiAuthInteractive())
        .then((ok) => !!ok)
        .finally(() => {
          authPromptInFlight = null;
        });
    }

    return authPromptInFlight;
  }

  async function apiRequest(url, options) {
    let retriedAfter401 = false;

    while (true) {
      const res = await fetch(url, applyAuthHeader(options));
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

      if (ok) {
        return data;
      }

      if (res.status === 401 && !retriedAfter401) {
        retriedAfter401 = true;
        const loginOk = await promptApiLoginIfNeeded();
        if (loginOk) {
          continue;
        }
      }

      let message = error || `HTTP ${res.status}`;
      if (res.status === 401 && !error) {
        message = 'Nao autenticado na API.';
      }
      const err = new Error(message);
      err.status = res.status;
      err.payload = body;
      throw err;
    }
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

  function hasApiAuth() {
    return !!readAuthToken();
  }

  async function validateAuthToken(token) {
    const res = await fetch('/api/summary', {
      headers: {
        Authorization: `Basic ${token}`
      }
    });

    if (res.status === 401) return { ok: false, reason: 'invalid' };
    if (res.ok) return { ok: true };
    return { ok: false, reason: 'unexpected' };
  }

  function showAuthLoginModal() {
    if (!document || !document.body) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      const panel = document.createElement('div');
      const title = document.createElement('h3');
      const desc = document.createElement('p');
      const form = document.createElement('form');
      const userLabel = document.createElement('label');
      const userInput = document.createElement('input');
      const passLabel = document.createElement('label');
      const passInput = document.createElement('input');
      const actions = document.createElement('div');
      const inlineError = document.createElement('div');
      const cancelBtn = document.createElement('button');
      const confirmBtn = document.createElement('button');

      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'rgba(0,0,0,0.55)';
      overlay.style.zIndex = '10000';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.padding = '16px';

      panel.style.width = '100%';
      panel.style.maxWidth = '420px';
      panel.style.background = '#1c2129';
      panel.style.border = '1px solid #3a4452';
      panel.style.borderRadius = '10px';
      panel.style.padding = '16px';
      panel.style.boxShadow = '0 14px 30px rgba(0,0,0,0.35)';
      panel.style.color = '#f5f5f5';

      title.textContent = 'Entrar na API';
      title.style.margin = '0 0 6px 0';
      title.style.fontSize = '18px';

      desc.textContent = 'Informe as credenciais configuradas no servidor.';
      desc.style.margin = '0 0 14px 0';
      desc.style.fontSize = '13px';
      desc.style.color = '#c4ccd5';

      form.style.display = 'grid';
      form.style.gap = '10px';

      inlineError.style.minHeight = '18px';
      inlineError.style.fontSize = '12px';
      inlineError.style.color = '#ffb3ab';
      inlineError.style.display = 'none';

      userLabel.textContent = 'Usuario';
      userLabel.style.display = 'grid';
      userLabel.style.gap = '5px';
      userLabel.style.fontSize = '13px';

      userInput.type = 'text';
      userInput.autocomplete = 'username';
      userInput.required = true;
      userInput.style.padding = '9px';
      userInput.style.border = '1px solid #4a5667';
      userInput.style.borderRadius = '6px';
      userInput.style.background = '#11151b';
      userInput.style.color = '#f5f5f5';

      passLabel.textContent = 'Senha';
      passLabel.style.display = 'grid';
      passLabel.style.gap = '5px';
      passLabel.style.fontSize = '13px';

      passInput.type = 'password';
      passInput.autocomplete = 'current-password';
      passInput.required = true;
      passInput.style.padding = '9px';
      passInput.style.border = '1px solid #4a5667';
      passInput.style.borderRadius = '6px';
      passInput.style.background = '#11151b';
      passInput.style.color = '#f5f5f5';

      actions.style.display = 'flex';
      actions.style.justifyContent = 'flex-end';
      actions.style.gap = '8px';
      actions.style.marginTop = '6px';

      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.style.padding = '8px 12px';
      cancelBtn.style.border = '1px solid #4a5667';
      cancelBtn.style.borderRadius = '6px';
      cancelBtn.style.background = '#1f2530';
      cancelBtn.style.color = '#f5f5f5';
      cancelBtn.style.cursor = 'pointer';

      confirmBtn.type = 'submit';
      confirmBtn.textContent = 'Entrar';
      confirmBtn.style.padding = '8px 14px';
      confirmBtn.style.border = '1px solid #d4af37';
      confirmBtn.style.borderRadius = '6px';
      confirmBtn.style.background = '#2d3642';
      confirmBtn.style.color = '#f5f5f5';
      confirmBtn.style.cursor = 'pointer';

      let settled = false;

      function setInlineError(message) {
        const text = String(message || '').trim();
        inlineError.textContent = text;
        inlineError.style.display = text ? 'block' : 'none';
      }

      function setSubmitting(isSubmitting) {
        userInput.disabled = !!isSubmitting;
        passInput.disabled = !!isSubmitting;
        cancelBtn.disabled = !!isSubmitting;
        confirmBtn.disabled = !!isSubmitting;
        confirmBtn.textContent = isSubmitting ? 'Validando...' : 'Entrar';
      }

      userInput.addEventListener('input', () => {
        if (inlineError.style.display !== 'none') setInlineError('');
      });

      passInput.addEventListener('input', () => {
        if (inlineError.style.display !== 'none') setInlineError('');
      });

      function close(result) {
        if (settled) return;
        settled = true;
        document.removeEventListener('keydown', onKeyDown);
        overlay.remove();
        resolve(result);
      }

      function onKeyDown(ev) {
        if (ev.key === 'Escape') {
          close(false);
        }
      }

      cancelBtn.addEventListener('click', () => close(false));
      overlay.addEventListener('click', (ev) => {
        if (ev.target === overlay) close(false);
      });

      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const username = String(userInput.value || '').trim();
        const password = String(passInput.value || '');
        if (!username || !password) {
          setInlineError('Usuario e senha sao obrigatorios.');
          return;
        }

        setInlineError('');
        setSubmitting(true);

        const token = btoa(`${username}:${password}`);
        let validation = null;

        try {
          validation = await validateAuthToken(token);
        } catch {
          setSubmitting(false);
          setInlineError('Falha de rede ao validar credenciais.');
          return;
        }

        if (!validation || !validation.ok) {
          setSubmitting(false);
          if (validation && validation.reason === 'invalid') {
            setInlineError('Usuario ou senha invalidos.');
          } else {
            setInlineError('Nao foi possivel validar no servidor.');
          }
          return;
        }

        writeAuthToken(token);
        notify('Credenciais API salvas no navegador', 'success');
        setSubmitting(false);
        close(true);
      });

      userLabel.appendChild(userInput);
      passLabel.appendChild(passInput);
      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);
      form.appendChild(userLabel);
      form.appendChild(passLabel);
      form.appendChild(inlineError);
      form.appendChild(actions);

      panel.appendChild(title);
      panel.appendChild(desc);
      panel.appendChild(form);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);
      document.addEventListener('keydown', onKeyDown);
      userInput.focus();
    });
  }

  async function loginApiAuthInteractive() {
    return showAuthLoginModal();
  }

  function logoutApiAuth() {
    writeAuthToken('');
    notify('Credenciais API removidas', 'info');
  }

  window.apiRequest = apiRequest;
  window.formatUiError = formatUiError;
  window.notify = notify;
  window.hasApiAuth = hasApiAuth;
  window.loginApiAuthInteractive = loginApiAuthInteractive;
  window.logoutApiAuth = logoutApiAuth;
  window.API_AUTH_CHANGED_EVENT = AUTH_CHANGED_EVENT;
})();
