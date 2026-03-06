const db = require('../db/db');

// cria/registra um lembrete de cobrança
function createReminder(data, callback) {
  const { budget_id, client_id, reminder_type, scheduled_date, sent_date, notes, status } = data;
  const sql = `INSERT INTO collection_reminders (budget_id, client_id, reminder_type, scheduled_date, sent_date, notes, status) 
               VALUES (?,?,?,?,?,?,?)`;
  
  db.run(
    sql,
    [budget_id, client_id, reminder_type || 'email', scheduled_date, sent_date || null, notes || '', status || 'pending'],
    function(err) {
      if (err) return callback(err);
      getById(this.lastID, callback);
    }
  );
}

// busca lembrete por id
function getById(id, callback) {
  const sql = `SELECT cr.*, c.name as client_name, c.email, b.code as budget_code, b.total_value, b.amount_paid 
               FROM collection_reminders cr
               LEFT JOIN clients c ON cr.client_id = c.id
               LEFT JOIN budgets b ON cr.budget_id = b.id
               WHERE cr.id = ?`;
  
  db.get(sql, [id], (err, row) => {
    callback(err, row);
  });
}

// lista todos os lembretes com filtros opcionais
function getAll(filters, callback) {
  let sql = `SELECT cr.*, c.name as client_name, c.email, b.code as budget_code, b.total_value, b.amount_paid 
             FROM collection_reminders cr
             LEFT JOIN clients c ON cr.client_id = c.id
             LEFT JOIN budgets b ON cr.budget_id = b.id
             WHERE 1=1`;
  
  const params = [];

  if (filters.status) {
    sql += ' AND cr.status = ?';
    params.push(filters.status);
  }

  if (filters.reminder_type) {
    sql += ' AND cr.reminder_type = ?';
    params.push(filters.reminder_type);
  }

  if (filters.budget_id) {
    sql += ' AND cr.budget_id = ?';
    params.push(filters.budget_id);
  }

  if (filters.client_id) {
    sql += ' AND cr.client_id = ?';
    params.push(filters.client_id);
  }

  sql += ' ORDER BY cr.scheduled_date ASC';

  db.all(sql, params, (err, rows) => {
    callback(err, rows || []);
  });
}

// busca lembretes pendentes (que devem ser enviados hoje ou antes)
function getPending(callback) {
  const today = new Date().toISOString().split('T')[0];
  const sql = `SELECT cr.*, c.name as client_name, c.email, b.code as budget_code, b.total_value, b.amount_paid 
               FROM collection_reminders cr
               LEFT JOIN clients c ON cr.client_id = c.id
               LEFT JOIN budgets b ON cr.budget_id = b.id
               WHERE cr.status = 'pending' 
               AND cr.scheduled_date <= ?
               ORDER BY cr.scheduled_date ASC`;
  
  db.all(sql, [today], (err, rows) => {
    callback(err, rows || []);
  });
}

// atualiza status do lembrete (sent, skipped, etc)
function updateStatus(id, status, sent_date, callback) {
  const sql = `UPDATE collection_reminders 
               SET status = ?, sent_date = ? 
               WHERE id = ?`;
  
  db.run(sql, [status, sent_date || null, id], function(err) {
    if (err) return callback(err);
    getById(id, callback);
  });
}

// gera lembretes automáticos para orçamentos vencidos
function generatePendingReminders(callback) {
  // busca orçamentos vencidos ou com dias específicos de atraso
  const today = new Date().toISOString().split('T')[0];
  
  db.serialize(function() {
    // para cada orçamento pendente, criar lembretes agendados
    db.all(
      `SELECT DISTINCT 
        b.id, b.client_id, b.code, b.created_at, 
        (julianday(?) - julianday(b.created_at)) as days_since_creation
       FROM budgets b
       WHERE b.status != 'completed' AND b.status != 'cancelled'
       AND b.amount_paid < b.total_value`,
      [today],
      (err, budgets) => {
        if (err) return callback(err);
        
        if (!budgets || budgets.length === 0) {
          return callback(null, { created: 0 });
        }

        let created = 0;
        let processed = 0;

        budgets.forEach(budget => {
          const daysOld = parseInt(budget.days_since_creation) || 0;
          const remindersToCreate = [];

          // criar lembrete em 7 dias
          if (daysOld >= 7) {
            remindersToCreate.push({
              budget_id: budget.id,
              client_id: budget.client_id,
              reminder_type: 'email',
              days: 7
            });
          }

          // criar lembrete em 14 dias
          if (daysOld >= 14) {
            remindersToCreate.push({
              budget_id: budget.id,
              client_id: budget.client_id,
              reminder_type: 'email',
              days: 14
            });
          }

          // criar lembrete em 30 dias
          if (daysOld >= 30) {
            remindersToCreate.push({
              budget_id: budget.id,
              client_id: budget.client_id,
              reminder_type: 'email',
              days: 30
            });
          }

          remindersToCreate.forEach(reminder => {
            // verificar se lembrete já existe
            const checkSql = `SELECT id FROM collection_reminders 
                              WHERE budget_id = ? AND reminder_type = ? AND days_overdue = ?`;
            
            db.get(checkSql, [reminder.budget_id, reminder.reminder_type, reminder.days], (err2, existing) => {
              if (!existing) {
                // criar novo lembrete
                createReminder({
                  budget_id: reminder.budget_id,
                  client_id: reminder.client_id,
                  reminder_type: reminder.reminder_type,
                  scheduled_date: today,
                  status: 'pending'
                }, (err3) => {
                  if (!err3) created++;
                  processed++;
                  if (processed === remindersToCreate.length) {
                    callback(null, { created, processed });
                  }
                });
              } else {
                processed++;
                if (processed === remindersToCreate.length) {
                  callback(null, { created, processed });
                }
              }
            });
          });
        });
      }
    );
  });
}

// exclui lembrete
function remove(id, callback) {
  db.run('DELETE FROM collection_reminders WHERE id = ?', [id], function(err) {
    if (err) return callback(err);
    callback(null, this.changes > 0);
  });
}

module.exports = {
  createReminder,
  getById,
  getAll,
  getPending,
  updateStatus,
  generatePendingReminders,
  remove
};
