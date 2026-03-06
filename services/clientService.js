// lógica de negócio e acesso a dados para clientes usando SQLite

const db = require('../db/db'); // instância do banco

// verifica se uma tabela possui uma coluna específica
function hasColumn(table, column, callback) {
  db.all(`PRAGMA table_info(${table})`, (err, columns) => {
    if (err) return callback(err);
    const has = columns && columns.some(c => c.name === column);
    callback(null, has); // devolve booleano
  });
}

// retorna todos os clientes ordenados por criação ou id
function getAll(filters, callback) {
  const opts = (typeof filters === 'function') ? {} : (filters || {});
  const done = (typeof filters === 'function') ? filters : callback;

  hasColumn('clients', 'created_at', (err, exists) => {
    if (err) return done(err);
    const order = exists ? 'created_at DESC' : 'id DESC'; // define ordenação
    const params = [];
    let sql = 'SELECT * FROM clients';

    if (opts.q) {
      sql += ' WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?';
      const pattern = `%${opts.q}%`;
      params.push(pattern, pattern, pattern);
    }

    sql += ` ORDER BY ${order}`;

    db.all(sql, params, (err2, rows) => {
      done(err2, rows); // retorna lista de clientes
    });
  });
}

// busca cliente por id
function getById(id, callback) {
  db.get('SELECT * FROM clients WHERE id = ?', [id], (err, row) => {
    callback(err, row);
  });
}

// insere novo cliente e retorna registro criado
function create(clientData, callback) {
  const { name, phone, email, notes } = clientData;
  const sql = `INSERT INTO clients (name, phone, email, notes) VALUES (?, ?, ?, ?)`;
  db.run(sql, [name, phone, email, notes], function(err) {
    if (err) return callback(err);
    getById(this.lastID, callback); // retorna com id gerado
  });
}

function update(id, clientData, callback) {
  const { name, phone, email, notes } = clientData;
  const sql = 'UPDATE clients SET name = ?, phone = ?, email = ?, notes = ? WHERE id = ?';
  db.run(sql, [name, phone || null, email || null, notes || null, id], function (err) {
    if (err) return callback(err);
    if (!this.changes) return callback(null, null);
    getById(id, callback);
  });
}

// exclui cliente por id
function remove(id, callback) {
  db.run('DELETE FROM clients WHERE id = ?', [id], function(err) {
    if (err) return callback(err);
    callback(null, this.changes > 0); // true se excluiu
  });
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
