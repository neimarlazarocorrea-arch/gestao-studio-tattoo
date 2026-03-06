const db = require('../db/db'); // instância do banco de dados

// retorna todas transações ordenadas pela data mais recente
// inclui código de orçamento (se houver) para facilitar exibição
function getAll(filters, callback) {
  const opts = (typeof filters === 'function') ? {} : (filters || {});
  const done = (typeof filters === 'function') ? filters : callback;
  const sql = `SELECT t.*, b.code as budget_code
               FROM transactions t
               LEFT JOIN budgets b ON t.budget_id = b.id
               WHERE 1=1`;

  const clauses = [];
  const params = [];

  if (opts.q) {
    const p = `%${opts.q}%`;
    clauses.push('(t.category LIKE ? OR t.description LIKE ? OR b.code LIKE ?)');
    params.push(p, p, p);
  }

  if (opts.type) {
    clauses.push('t.type = ?');
    params.push(opts.type);
  }

  let finalSql = sql;
  if (clauses.length) {
    finalSql += ` AND ${clauses.join(' AND ')}`;
  }

  finalSql += ' ORDER BY t.date DESC';

  db.all(finalSql, params, (err, rows) => {
    done(err, rows);
  });
}

// busca transação por id
function getById(id, callback) {
  db.get('SELECT * FROM transactions WHERE id = ?', [id], (err, row) => {
    callback(err, row);
  });
}

// busca transação vinculada a um agendamento específico
function getByAppointmentId(appointmentId, callback) {
  db.get('SELECT * FROM transactions WHERE appointment_id = ?', [appointmentId], (err, row) => {
    callback(err, row);
  });
}

// insere nova transação (pode estar ligada a agendamento ou orçamento)
function create(data, callback) {
  const { type, category, description, amount, date, appointment_id, budget_id } = data;
  const sql = `INSERT INTO transactions (type, category, description, amount, date, appointment_id, budget_id) VALUES (?,?,?,?,?,?,?)`;
  db.run(
    sql,
    [type, category, description, amount, date, appointment_id || null, budget_id || null],
    function(err) {
      if (err) return callback(err);
      getById(this.lastID, callback); // retorna transação criada
    }
  );
}

// cria transação a partir de um orçamento (serviço de conveniência)
// pode passar `amount` para pagamento parcial
function createFromBudget(budget, amount, callback) {
  if (typeof amount === 'function') {
    callback = amount;
    amount = null;
  }
  // budget deve ser um objeto completo com total_value e id
  if (!budget || budget.id == null) return callback(new Error('invalid budget'));
  const data = {
    type: 'in',
    category: 'Orçamento',
    description: `Recebimento de orçamento #${budget.id}`,
    amount: amount != null ? amount : (budget.total_value || 0),
    date: new Date().toISOString().split('T')[0],
    budget_id: budget.id,
  };
  create(data, callback);
}

// atualiza transação existente
function update(id, data, callback) {
  const { type, category, description, amount, date } = data;
  const sql = `UPDATE transactions SET type=?, category=?, description=?, amount=?, date=? WHERE id=?`;
  db.run(sql, [type, category, description, amount, date, id], function(err) {
    if (err) return callback(err);
    getById(id, callback); // retorna dados atualizados
  });
}

// exclui transação por id
function remove(id, callback) {
  db.run('DELETE FROM transactions WHERE id = ?', [id], function(err) {
    if (err) return callback(err);
    callback(null, this.changes > 0); // true se excluiu algo
  });
}

module.exports = {
  getAll,
  getById,
  getByAppointmentId,
  create,
  createFromBudget,
  update,
  remove
};