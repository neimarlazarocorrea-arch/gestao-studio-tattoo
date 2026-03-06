const db = require('../db/db');

function logAction(payload, callback) {
  const data = payload || {};
  const sql = `
    INSERT INTO audit_logs
    (action, entity_type, entity_id, actor, actor_role, route, method, ip, details)
    VALUES (?,?,?,?,?,?,?,?,?)
  `;

  db.run(
    sql,
    [
      data.action || 'unknown',
      data.entity_type || null,
      data.entity_id || null,
      data.actor || null,
      data.actor_role || null,
      data.route || null,
      data.method || null,
      data.ip || null,
      data.details ? JSON.stringify(data.details) : null
    ],
    (err) => {
      if (typeof callback === 'function') callback(err || null);
    }
  );
}

function logFromRequest(req, payload, callback) {
  const user = req && req.authUser ? req.authUser : null;
  const base = {
    actor: user ? user.username : 'anonymous',
    actor_role: user ? user.role : null,
    route: req ? req.originalUrl : null,
    method: req ? req.method : null,
    ip: req ? (req.headers['x-forwarded-for'] || req.ip || null) : null
  };

  logAction({ ...base, ...(payload || {}) }, callback);
}

module.exports = {
  logAction,
  logFromRequest
};
