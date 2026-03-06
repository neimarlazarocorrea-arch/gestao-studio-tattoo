const db = require('../db/db');

// cria um registro de recibo para rastreamento
function createReceipt(data, callback) {
  const { type, reference_id, reference_type, amount, date, description, notes } = data;
  const sql = `INSERT INTO receipts (type, reference_id, reference_type, amount, date, description, notes) 
               VALUES (?,?,?,?,?,?,?)`;
  
  db.run(sql, [type, reference_id, reference_type, amount, date || new Date().toISOString().split('T')[0], description || '', notes || ''], 
    function(err) {
      if (err) return callback(err);
      getById(this.lastID, callback);
    }
  );
}

// busca recibo por id
function getById(id, callback) {
  db.get('SELECT * FROM receipts WHERE id = ?', [id], (err, row) => {
    callback(err, row);
  });
}

// lista todos os recibos com filtros opcionais
function getAll(filters, callback) {
  let sql = 'SELECT * FROM receipts WHERE 1=1';
  const params = [];

  if (filters.type) {
    sql += ' AND type = ?';
    params.push(filters.type);
  }
  
  if (filters.reference_type) {
    sql += ' AND reference_type = ?';
    params.push(filters.reference_type);
  }

  if (filters.start_date && filters.end_date) {
    sql += ' AND date BETWEEN ? AND ?';
    params.push(filters.start_date, filters.end_date);
  }

  sql += ' ORDER BY date DESC';

  db.all(sql, params, (err, rows) => {
    callback(err, rows || []);
  });
}

// busca recibos de uma transação específica
function getByTransaction(transactionId, callback) {
  db.all(
    `SELECT * FROM receipts 
     WHERE reference_type = 'transaction' AND reference_id = ? 
     ORDER BY date DESC`,
    [transactionId],
    (err, rows) => {
      callback(err, rows || []);
    }
  );
}

// busca recibos de um orçamento específico
function getByBudget(budgetId, callback) {
  db.all(
    `SELECT * FROM receipts 
     WHERE reference_type = 'budget' AND reference_id = ? 
     ORDER BY date DESC`,
    [budgetId],
    (err, rows) => {
      callback(err, rows || []);
    }
  );
}

// delete recibo
function remove(id, callback) {
  db.run('DELETE FROM receipts WHERE id = ?', [id], function(err) {
    if (err) return callback(err);
    callback(null, this.changes > 0);
  });
}

module.exports = {
  createReceipt,
  getById,
  getAll,
  getByTransaction,
  getByBudget,
  remove
};
