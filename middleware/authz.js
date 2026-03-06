function parseBool(value) {
  return /^(1|true|yes|on)$/i.test(String(value || '').trim());
}

function parseUsers() {
  const raw = process.env.AUTH_USERS || '';
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [username, password, role] = entry.split(':');
      return { username, password, role: role || 'operator' };
    })
    .filter((u) => u.username && u.password);
}

function decodeBasic(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) return null;
  try {
    const base64 = authHeader.slice(6).trim();
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx <= 0) return null;
    return {
      username: decoded.slice(0, idx),
      password: decoded.slice(idx + 1)
    };
  } catch {
    return null;
  }
}

function createAuthMiddleware() {
  return (req, res, next) => {
    const enabled = parseBool(process.env.AUTH_ENABLED);
    if (!enabled) return next();

    const creds = decodeBasic(req.headers.authorization || '');
    if (!creds) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Tattoo Studio Pro"');
      return res.status(401).json({ error: 'Autenticacao obrigatoria' });
    }

    const users = parseUsers();
    const matched = users.find(
      (u) => u.username === creds.username && u.password === creds.password
    );

    if (!matched) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Tattoo Studio Pro"');
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    req.authUser = {
      username: matched.username,
      role: matched.role
    };

    const isWriteMethod = req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS';
    if (isWriteMethod && !['admin', 'operator'].includes(matched.role)) {
      return res.status(403).json({ error: 'Perfil sem permissao para alteracoes' });
    }

    next();
  };
}

module.exports = {
  createAuthMiddleware
};
