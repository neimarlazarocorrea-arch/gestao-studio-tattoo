const db = require('../db/db');
const ALLOWED_STATUS = ['open', 'in_progress', 'completed', 'cancelled'];
const STATUS_TRANSITIONS = {
  open: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
};

function generateServiceOrderCode(callback) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  db.get(
    'SELECT COUNT(*) as cnt FROM service_orders WHERE code LIKE ?',
    [`OS-${today}-%`],
    (err, row) => {
      if (err) return callback(err);
      const nextNum = String((row?.cnt || 0) + 1).padStart(4, '0');
      callback(null, `OS-${today}-${nextNum}`);
    }
  );
}

function getAll(filters, callback) {
  const opts = filters || {};
  let sql = `
    SELECT so.*, c.name as client_name, b.code as budget_code
    FROM service_orders so
    LEFT JOIN clients c ON c.id = so.client_id
    LEFT JOIN budgets b ON b.id = so.budget_id
  `;
  const params = [];

  if (opts.status) {
    sql += ' WHERE so.status = ?';
    params.push(opts.status);
  }

  sql += ' ORDER BY so.created_at DESC';

  db.all(sql, params, (err, rows) => callback(err, rows || []));
}

function getById(id, callback) {
  db.get(
    `
    SELECT so.*, c.name as client_name, b.code as budget_code
    FROM service_orders so
    LEFT JOIN clients c ON c.id = so.client_id
    LEFT JOIN budgets b ON b.id = so.budget_id
    WHERE so.id = ?
    `,
    [id],
    (err, row) => callback(err, row || null)
  );
}

function getByBudgetId(budgetId, callback) {
  db.get(
    'SELECT * FROM service_orders WHERE budget_id = ?',
    [budgetId],
    (err, row) => callback(err, row || null)
  );
}

function createFromBudget(budgetId, callback) {
  db.get('SELECT * FROM budgets WHERE id = ?', [budgetId], (err, budget) => {
    if (err) return callback(err);
    if (!budget) return callback(new Error('Orçamento não encontrado'));

    getByBudgetId(budgetId, (err2, existing) => {
      if (err2) return callback(err2);
      if (existing) return callback(null, existing);

      generateServiceOrderCode((err3, code) => {
        if (err3) return callback(err3);

        const status = budget.status === 'completed' ? 'completed' : 'open';
        const completedAt = status === 'completed' ? new Date().toISOString() : null;

        db.run(
          `
          INSERT INTO service_orders
          (budget_id, client_id, code, title, total_value, sessions_count, sessions_completed, status, accepted_at, completed_at)
          VALUES (?,?,?,?,?,?,?,?,?,?)
          `,
          [
            budget.id,
            budget.client_id,
            code,
            budget.title || null,
            budget.total_value || 0,
            budget.sessions_count || 1,
            budget.sessions_completed || 0,
            status,
            new Date().toISOString(),
            completedAt
          ],
          function (err4) {
            if (err4) return callback(err4);
            getById(this.lastID, callback);
          }
        );
      });
    });
  });
}

function closeByBudget(budgetId, callback) {
  createFromBudget(budgetId, (err, serviceOrder) => {
    if (err) return callback(err);

    db.get('SELECT sessions_count FROM budgets WHERE id = ?', [budgetId], (err2, budget) => {
      if (err2) return callback(err2);
      if (!budget) return callback(new Error('Orçamento não encontrado'));

      db.run(
        `
        UPDATE service_orders
        SET status = 'completed',
            sessions_completed = ?,
            completed_at = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE budget_id = ?
        `,
        [budget.sessions_count || 0, new Date().toISOString(), budgetId],
        (err3) => {
          if (err3) return callback(err3);
          getById(serviceOrder.id, callback);
        }
      );
    });
  });
}

function updateStatus(id, nextStatus, callback) {
  if (!ALLOWED_STATUS.includes(nextStatus)) {
    return callback(new Error('Status inválido'));
  }

  getById(id, (err, row) => {
    if (err) return callback(err);
    if (!row) return callback(new Error('OS não encontrada'));

    if (row.status === 'completed' || row.status === 'cancelled') {
      return callback(new Error('OS finalizada não pode mudar de status'));
    }

    const allowedTargets = STATUS_TRANSITIONS[row.status] || [];
    if (!allowedTargets.includes(nextStatus)) {
      return callback(new Error(`Transicao de status invalida: ${row.status} -> ${nextStatus}`));
    }

    const completedAt = nextStatus === 'completed' ? new Date().toISOString() : row.completed_at;

    db.run(
      `
      UPDATE service_orders
      SET status = ?,
          completed_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [nextStatus, completedAt || null, id],
      (err2) => {
        if (err2) return callback(err2);
        getById(id, callback);
      }
    );
  });
}

module.exports = {
  getAll,
  getById,
  getByBudgetId,
  createFromBudget,
  closeByBudget,
  updateStatus
};
