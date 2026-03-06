function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeErrorPayload(payload, statusCode) {
  if (isObject(payload)) {
    const message = payload.error || payload.message || `HTTP ${statusCode}`;
    return { ok: false, error: String(message) };
  }

  if (typeof payload === 'string' && payload.trim()) {
    return { ok: false, error: payload };
  }

  return { ok: false, error: `HTTP ${statusCode}` };
}

module.exports = function apiContractMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (payload) => {
    const isApiRoute = req.originalUrl && req.originalUrl.startsWith('/api/');
    if (!isApiRoute) {
      return originalJson(payload);
    }

    // Respect payloads that already follow contract.
    if (isObject(payload) && Object.prototype.hasOwnProperty.call(payload, 'ok')) {
      return originalJson(payload);
    }

    const statusCode = res.statusCode || 200;

    if (statusCode >= 400) {
      return originalJson(normalizeErrorPayload(payload, statusCode));
    }

    return originalJson({ ok: true, data: payload });
  };

  next();
};
