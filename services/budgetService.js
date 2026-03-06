// serviço de orçamentos com funcionalidades de CRUD e gerenciamento de materiais

const db = require('../db/db'); // instância do banco de dados
const serviceOrderService = require('./serviceOrderService');

// retorna todos os orçamentos ordenados por data de criação descendente
function getAll(callback) {
  db.all('SELECT * FROM budgets ORDER BY created_at DESC', [], (err, rows) => {
    callback(err, rows); // entrega resultados
  });
}

// busca orçamento por id junto com seus materiais
function getById(id, callback) {
  db.get('SELECT * FROM budgets WHERE id = ?', [id], (err, budget) => {
    if (err) return callback(err);
    if (!budget) return callback(null, null);
    
    // busca materiais do orçamento
    db.all('SELECT * FROM budget_materials WHERE budget_id = ?', [id], (err2, materials) => {
      if (err2) return callback(err2);
      budget.materials = materials || [];
      callback(null, budget);
    });
  });
}

// busca orçamentos por cliente
function getByClientId(clientId, callback) {
  db.all('SELECT * FROM budgets WHERE client_id = ? ORDER BY created_at DESC', [clientId], (err, budgets) => {
    if (err) return callback(err);
    // busca materiais para cada orçamento
    if (!budgets || budgets.length === 0) return callback(null, []);
    
    let completed = 0;
    budgets.forEach((budget, idx) => {
      db.all('SELECT * FROM budget_materials WHERE budget_id = ?', [budget.id], (err2, materials) => {
        if (!err2) budgets[idx].materials = materials || [];
        completed++;
        if (completed === budgets.length) callback(null, budgets);
      });
    });
  });
}

// gera código único para orçamento
function generateBudgetCode(callback) {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
  db.get('SELECT COUNT(*) as cnt FROM budgets WHERE code LIKE ?', [`ORC-${today}%`], (err, row) => {
    if (err) return callback(err);
    const nextNum = String((row?.cnt || 0) + 1).padStart(4, '0');
    const code = `ORC-${today}-${nextNum}`;
    callback(null, code);
  });
}

// cria novo orçamento com materiais
function create(data, callback) {
  const { client_id, title, estimated_time_min, sessions_count, total_value, notes } = data;
  const materials = data.materials || []; // array de materiais
  
  // gera código único
  generateBudgetCode((err, code) => {
    if (err) return callback(err);
    
    const sql = `INSERT INTO budgets (client_id, title, code, estimated_time_min, sessions_count, total_value, notes, amount_paid) 
                 VALUES (?,?,?,?,?,?,?,?)`;
    
    db.run(sql, [client_id, title, code, estimated_time_min || 180, sessions_count || 1, total_value || 0, notes || null, 0], 
      function(err2) {
        if (err2) return callback(err2);
        const budgetId = this.lastID;
        
        // insere materiais se fornecidos
        if (materials.length === 0) {
          getById(budgetId, callback);
        } else {
          insertMaterials(budgetId, materials, (err3) => {
            if (err3) return callback(err3);
            getById(budgetId, callback);
          });
        }
      }
    );
  });
}

// insere múltiplos materiais em um orçamento
function insertMaterials(budgetId, materials, callback) {
  if (!materials || materials.length === 0) return callback(null);
  
  let completed = 0;
  let hasError = false;
  
  materials.forEach(mat => {
    // se material_id for informado, tenta preencher item_name/unit_cost a partir da tabela materials
    if (mat.material_id && !mat.item_name) {
      db.get('SELECT name, unit_cost FROM materials WHERE id = ?', [mat.material_id], (errm, mrow) => {
        if (!errm && mrow) {
          mat.item_name = mrow.name;
          if (!mat.unit_cost || mat.unit_cost === 0) mat.unit_cost = mrow.unit_cost;
        }
        // continua a insercao mesmo que a consulta falhe ou nao retorne dados
        const sql = `INSERT INTO budget_materials (budget_id, item_name, quantity, unit_cost, material_id) VALUES (?,?,?,?,?)`;
        db.run(sql, [budgetId, mat.item_name, mat.quantity || 1, mat.unit_cost || 0, mat.material_id || null], finishRow);
      });
    } else {
      const sql = `INSERT INTO budget_materials (budget_id, item_name, quantity, unit_cost, material_id) VALUES (?,?,?,?,?)`;
      db.run(sql, [budgetId, mat.item_name, mat.quantity || 1, mat.unit_cost || 0, mat.material_id || null], finishRow);
    }

    function finishRow(err) {
      if (err && !hasError) {
        hasError = true;
        return callback(err);
      }
      completed++;
      if (completed === materials.length && !hasError) callback(null);
    }
  });
}

// atualiza orçamento existente
function update(id, data, callback) {
  const { client_id, title, estimated_time_min, sessions_count, total_value, notes, amount_paid, status } = data;
  const materials = data.materials || [];
  
  const sql = `UPDATE budgets SET client_id=?, title=?, estimated_time_min=?, sessions_count=?, total_value=?, notes=?, amount_paid=?, status=? WHERE id=?`;
  
  db.run(sql, [client_id, title, estimated_time_min || 180, sessions_count || 1, total_value || 0, notes || null, amount_paid || 0, status || 'active', id], 
    function(err) {
      if (err) return callback(err);
      
      // remove materiais antigos
      db.run('DELETE FROM budget_materials WHERE budget_id = ?', [id], (err2) => {
        if (err2) return callback(err2);
        
        // insere novos materiais
        if (materials.length === 0) {
          getById(id, (err3, budget) => {
            if (err3) return callback(err3);
            if ((budget?.status || '') === 'completed') {
              return serviceOrderService.closeByBudget(id, (err4) => {
                if (err4) return callback(err4);
                callback(null, budget);
              });
            }
            callback(null, budget);
          });
        } else {
          insertMaterials(id, materials, (err3) => {
            if (err3) return callback(err3);
            getById(id, (err4, budget) => {
              if (err4) return callback(err4);
              if ((budget?.status || '') === 'completed') {
                return serviceOrderService.closeByBudget(id, (err5) => {
                  if (err5) return callback(err5);
                  callback(null, budget);
                });
              }
              callback(null, budget);
            });
          });
        }
      });
    }
  );
}

// exclui orçamento e seus materiais
function remove(id, callback) {
  db.run('DELETE FROM budgets WHERE id = ?', [id], function(err) {
    if (err) return callback(err);
    callback(null, this.changes > 0); // true se excluiu algo
  });
}

// registra pagamento parcial/total para um orçamento
function recordPayment(budgetId, amount, callback) {
  if (amount == null || amount <= 0) return callback(new Error('Invalid amount'));
  getById(budgetId, (err, budget) => {
    if (err) return callback(err);
    if (!budget) return callback(new Error('Budget not found'));

    const paid = (budget.amount_paid || 0) + amount;
    let status = budget.status;
    if (paid >= (budget.total_value || 0)) {
      status = 'completed';
    } else {
      status = 'active';
    }

    const sql = `UPDATE budgets SET amount_paid = ?, status = ? WHERE id = ?`;
    db.run(sql, [paid, status, budgetId], function(err2) {
      if (err2) return callback(err2);
      // retorna orcamento atualizado
      getById(budgetId, (err3, updated) => {
        if (err3) return callback(err3);
        if (status === 'completed') {
          return serviceOrderService.closeByBudget(budgetId, (err4) => {
            if (err4) return callback(err4);
            callback(null, updated);
          });
        }
        callback(null, updated);
      });
    });
  });
}

// fecha orçamento e garante criação/fechamento de OS
function close(id, callback) {
  getById(id, (err, budget) => {
    if (err) return callback(err);
    if (!budget) return callback(new Error('Orçamento não encontrado'));

    serviceOrderService.getByBudgetId(id, (err2, serviceOrder) => {
      if (err2) return callback(err2);
      if (!serviceOrder) {
        return callback(new Error('Nao e possivel fechar o orcamento sem ordem de servico vinculada'));
      }

      if (serviceOrder.status !== 'completed') {
        return callback(new Error(`Nao e possivel fechar o orcamento com OS em status ${serviceOrder.status}`));
      }

      db.run(
        `UPDATE budgets SET status = 'completed', sessions_completed = ? WHERE id = ?`,
        [budget.sessions_count || 0, id],
        (err3) => {
          if (err3) return callback(err3);

          getById(id, (err4, updatedBudget) => {
            if (err4) return callback(err4);
            callback(null, { budget: updatedBudget, service_order: serviceOrder });
          });
        }
      );
    });
  });
}

module.exports = {
  getAll,
  getById,
  getByClientId,
  create,
  update,
  remove,
  recordPayment,
  close
};
