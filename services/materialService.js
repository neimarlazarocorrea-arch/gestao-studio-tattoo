// serviço de controle de estoque de materiais com funcionalidades de cadastro, movimento e baixa

const db = require('../db/db'); // instância do banco de dados

// retorna todos os materiais ordenados por nome
function getAll(callback) {
  db.all('SELECT * FROM materials ORDER BY name', [], (err, rows) => {
    callback(err, rows); // entrega resultados
  });
}

// busca material por id
function getById(id, callback) {
  db.get('SELECT * FROM materials WHERE id = ?', [id], (err, material) => {
    callback(err, material);
  });
}

// busca materiais com estoque baixo (qty <= min_qty)
function getLowStock(callback) {
  db.all('SELECT * FROM materials WHERE current_qty <= min_qty ORDER BY name', [], (err, rows) => {
    callback(err, rows);
  });
}

// cria novo material
function create(data, callback) {
  const { name, brand, current_qty, min_qty, unit_cost, unit, notes } = data;
  
  const sql = `INSERT INTO materials (name, brand, current_qty, min_qty, unit_cost, unit, notes) 
               VALUES (?,?,?,?,?,?,?)`;
  
  db.run(sql, [name, brand || null, current_qty || 0, min_qty || 0, unit_cost || 0, unit || null, notes || null],
    function(err) {
      if (err) return callback(err);
      getById(this.lastID, callback); // retorna registro criado
    }
  );
}

// atualiza material existente
function update(id, data, callback) {
  const { name, brand, current_qty, min_qty, unit_cost, unit, notes } = data;
  
  const sql = `UPDATE materials SET name=?, brand=?, current_qty=?, min_qty=?, unit_cost=?, unit=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`;
  
  db.run(sql, [name, brand || null, current_qty || 0, min_qty || 0, unit_cost || 0, unit || null, notes || null, id],
    function(err) {
      if (err) return callback(err);
      getById(id, callback); // retorna dados atualizados
    }
  );
}

// exclui material
function remove(id, callback) {
  db.run('DELETE FROM materials WHERE id = ?', [id], function(err) {
    if (err) return callback(err);
    callback(null, this.changes > 0); // true se excluiu algo
  });
}

// registra entrada de material (compra)
function recordEntry(materialId, quantity, notes, callback) {
  // primeiro atualiza quantidade
  db.get('SELECT current_qty FROM materials WHERE id = ?', [materialId], (err, material) => {
    if (err) return callback(err);
    if (!material) return callback(new Error('Material não encontrado'));
    
    const newQty = material.current_qty + quantity;
    
    db.run('UPDATE materials SET current_qty = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newQty, materialId],
      (err2) => {
        if (err2) return callback(err2);
        
        // registra movimento
        const movementSql = `INSERT INTO material_movements (material_id, movement_type, quantity, reason, notes) 
                             VALUES (?,?,?,?,?)`;
        db.run(movementSql, [materialId, 'entrada', quantity, 'Entrada de estoque', notes || null], (err3) => {
          if (err3) return callback(err3);
          getById(materialId, callback);
        });
      }
    );
  });
}

// registra saída de material (ajuste/perda)
function recordExit(materialId, quantity, reason, notes, callback) {
  // primeiro verifica quantidade disponível
  db.get('SELECT current_qty FROM materials WHERE id = ?', [materialId], (err, material) => {
    if (err) return callback(err);
    if (!material) return callback(new Error('Material não encontrado'));
    
    if (material.current_qty < quantity) {
      return callback(new Error('Quantidade insuficiente em estoque'));
    }
    
    const newQty = material.current_qty - quantity;
    
    db.run('UPDATE materials SET current_qty = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newQty, materialId],
      (err2) => {
        if (err2) return callback(err2);
        
        // registra movimento
        const movementSql = `INSERT INTO material_movements (material_id, movement_type, quantity, reason, notes) 
                             VALUES (?,?,?,?,?)`;
        db.run(movementSql, [materialId, 'saída', quantity, reason || 'Saída de estoque', notes || null], (err3) => {
          if (err3) return callback(err3);
          getById(materialId, callback);
        });
      }
    );
  });
}

// registra uso de material em tatuagem
function recordUsage(materialId, appointmentId, quantityUsed, notes, callback) {
  recordExit(materialId, quantityUsed, 'Uso em tatuagem', `Agendamento #${appointmentId}`, (err) => {
    if (err) return callback(err);
    
    // registra no histórico de uso
    const usageSql = `INSERT INTO material_usage (material_id, appointment_id, quantity_used, notes) 
                      VALUES (?,?,?,?)`;
    db.run(usageSql, [materialId, appointmentId, quantityUsed, notes || null], (err2) => {
      if (err2) return callback(err2);
      getById(materialId, callback);
    });
  });
}

// registra múltiplos usos de materiais em uma tatuagem
function recordAppointmentMaterials(appointmentId, materialsUsed, callback) {
  if (!materialsUsed || materialsUsed.length === 0) {
    return callback(null, { recorded: 0 });
  }
  
  let completed = 0;
  let hasError = false;
  let recorded = 0;
  
  materialsUsed.forEach(usage => {
    recordUsage(usage.material_id, appointmentId, usage.quantity, usage.notes, (err) => {
      if (err && !hasError) {
        hasError = true;
        return callback(err);
      }
      completed++;
      if (!err) recorded++;
      if (completed === materialsUsed.length && !hasError) {
        callback(null, { recorded });
      }
    });
  });
}

// retorna histórico de movimentações de um material
function getMovementHistory(materialId, callback) {
  db.all('SELECT * FROM material_movements WHERE material_id = ? ORDER BY recorded_at DESC',
    [materialId],
    (err, rows) => {
      callback(err, rows);
    }
  );
}

// retorna histórico de uso de um material em tatuagens
function getUsageHistory(materialId, callback) {
  const sql = `SELECT mu.*,a.date,a.service,c.name as client_name
               FROM material_usage mu
               LEFT JOIN appointments a ON a.id = mu.appointment_id
               LEFT JOIN clients c ON c.id = a.client_id
               WHERE mu.material_id = ?
               ORDER BY mu.used_at DESC`;
  
  db.all(sql, [materialId], (err, rows) => {
    callback(err, rows);
  });
}
// busca materiais cujo nome contenha o termo, case-insensitive
function searchByName(term, callback) {
  const pattern = `%${term}%`;
  db.all('SELECT * FROM materials WHERE name LIKE ? COLLATE NOCASE ORDER BY name', [pattern], (err, rows) => {
    callback(err, rows);
  });
}
module.exports = {
  getAll,
  getById,
  getLowStock,
  create,
  update,
  remove,
  recordEntry,
  recordExit,
  recordUsage,
  recordAppointmentMaterials,
  getMovementHistory,
  getUsageHistory,
  searchByName
};
