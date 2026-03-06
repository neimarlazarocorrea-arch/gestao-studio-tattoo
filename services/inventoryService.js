const db = require('../db/db'); // instância do banco de dados

// retorna todos os itens do inventário ordenados pelo nome do item
function getAll(callback) {
  db.all('SELECT * FROM inventory ORDER BY item', [], (err, rows) => {
    callback(err, rows); // entrega resultados
  });
}

// busca item por id
function getById(id, callback) {
  db.get('SELECT * FROM inventory WHERE id = ?', [id], (err, row) => {
    callback(err, row);
  });
}

// cria novo registro de inventário
function create(data, callback) {
  const { item, brand, qty, min_qty, unit_cost } = data;
  const sql = `INSERT INTO inventory (item, brand, qty, min_qty, unit_cost) VALUES (?,?,?,?,?)`;
  db.run(sql, [item, brand, qty, min_qty, unit_cost], function(err) {
    if (err) return callback(err);
    getById(this.lastID, callback); // retorna registro criado
  });
}

// atualiza item existente
function update(id, data, callback) {
  const { item, brand, qty, min_qty, unit_cost } = data;
  const sql = `UPDATE inventory SET item=?, brand=?, qty=?, min_qty=?, unit_cost=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`;
  db.run(sql, [item, brand, qty, min_qty, unit_cost, id], function(err) {
    if (err) return callback(err);
    getById(id, callback); // retorna dados atualizados
  });
}

// exclui item do inventário
function remove(id, callback) {
  db.run('DELETE FROM inventory WHERE id = ?', [id], function(err) {
    if (err) return callback(err);
    callback(null, this.changes > 0); // true se excluiu algo
  });
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};