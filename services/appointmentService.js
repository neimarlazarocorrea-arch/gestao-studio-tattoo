const db = require('../db/db'); // importa instância do banco SQLite
const serviceOrderService = require('./serviceOrderService');

const DEFAULT_DURATION_MIN = 180; // duração padrão em minutos (3h)

// converte string 'HH:MM' em minutos desde meia-noite
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null; // validar formato

  const [h, m] = timeStr.split(':').map(x => Number.parseInt(x, 10)); // separa horas e minutos

  if (!Number.isFinite(h) || !Number.isFinite(m)) return null; // erro de parse

  return h * 60 + m; // retorna total de minutos
}

// garante duração válida ou usa padrão
function normalizeDuration(duration_min) {
  const d = Number.parseInt(String(duration_min ?? ''), 10); // parseando

  if (!Number.isFinite(d) || d <= 0) {
    return DEFAULT_DURATION_MIN; // usa valor padrão se inválido
  }

  return d; // valor válido
}

// lista agendamentos com filtros opcionais
function list(opts = {}, callback) {
  let sql = 'SELECT * FROM appointments';
  const clauses = [];
  const params = [];

  if (opts.from) {
    clauses.push('date >= ?');
    params.push(opts.from); // filtro de data inicial
  }

  if (opts.to) {
    clauses.push('date <= ?');
    params.push(opts.to); // filtro de data final
  }

  if (opts.status) {
    clauses.push('status = ?');
    params.push(opts.status); // filtro por status
  }

  if (opts.client_id) {
    clauses.push('client_id = ?');
    params.push(opts.client_id); // filtro por cliente
  }

  if (opts.service_order_id) {
    clauses.push('service_order_id = ?');
    params.push(opts.service_order_id); // filtro por ordem de serviço
  }

  if (clauses.length) {
    sql += ' WHERE ' + clauses.join(' AND '); // adiciona cláusulas WHERE
  }

  sql += ' ORDER BY date, time'; // ordena resultados

  db.all(sql, params, (err, rows) => {
    callback(err, rows); // devolve ao chamador
  });
}

function resolveServiceOrderId(serviceOrderId, budgetId, callback) {
  if (serviceOrderId) return callback(null, serviceOrderId);
  if (!budgetId) return callback(null, null);

  db.get(
    'SELECT id FROM service_orders WHERE budget_id = ?',
    [budgetId],
    (err, row) => {
      if (err) return callback(err);
      callback(null, row ? row.id : null);
    }
  );
}

// busca agendamento pelo id
function getById(id, callback) {
  db.get(
    'SELECT * FROM appointments WHERE id = ?',
    [id],
    (err, row) => callback(err, row)
  );
}

/**
 * Regra de conflito:
 * Novo intervalo [startMin, endMin)
 * Conflita se:
 * existStart < endMin AND existEnd > startMin
 */
function checkConflict(date, time, duration_min, excludeId, callback) {
  const startMin = timeToMinutes(time); // início em minutos
  const durMin = normalizeDuration(duration_min); // duração normalizada
  const endMin = startMin === null ? null : startMin + durMin; // fim

  if (!date || startMin === null || endMin === null) {
    return callback(null, false); // dados insuficientes -> sem conflito
  }

  let sql = `
    SELECT COUNT(*) as count
    FROM appointments
    WHERE date = ?
      AND (status IS NULL OR status = 'scheduled')
      AND (
        (CAST(substr(time,1,2) AS INT) * 60 + CAST(substr(time,4,2) AS INT)) < ?
        AND
        (CAST(substr(time,1,2) AS INT) * 60 + CAST(substr(time,4,2) AS INT) + COALESCE(duration_min, ?)) > ?
      )
  `; // consulta que verifica interseção de intervalos

  const params = [
    date,
    endMin,
    DEFAULT_DURATION_MIN,
    startMin
  ];

  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId); // ignora um id específico (update)
  }

  db.get(sql, params, (err, row) => {
    if (err) return callback(err);
    callback(null, (row?.count || 0) > 0); // true se existe conflito
  });
}

// cria novo agendamento
function create(data, callback) {
  const {
    client_id,
    budget_id,
    service_order_id,
    date,
    time,
    service,
    price,
    status,
    notes,
    duration_min,
    session_number
  } = data; // extrai campos

  const durMin = normalizeDuration(duration_min); // determina duração

  const sql = `
    INSERT INTO appointments
    (client_id, budget_id, service_order_id, date, time, service, price, status, notes, duration_min, session_number)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `; // query de inserção

  resolveServiceOrderId(service_order_id, budget_id, (err, resolvedServiceOrderId) => {
    if (err) return callback(err);

    db.run(
      sql,
      [
        client_id,
        budget_id || null,
        resolvedServiceOrderId || null,
        date,
        time,
        service,
        Number(price) || 0,
        status || 'scheduled',
        notes ?? null,
        durMin,
        session_number || 1
      ],
      function (err2) {
        if (err2) return callback(err2);
        getById(this.lastID, callback); // retorna registro recém-criado
      }
    );
  });
}

// atualiza agendamento existente
function update(id, data, callback) {
  const {
    client_id,
    budget_id,
    service_order_id,
    date,
    time,
    service,
    price,
    status,
    notes,
    duration_min
  } = data; // campos enviados

  const durMin = normalizeDuration(duration_min); // duração correta

  const sql = `
    UPDATE appointments
    SET client_id=?,
        budget_id=?,
        service_order_id=?,
        date=?,
        time=?,
        service=?,
        price=?,
        status=?,
        notes=?,
        duration_min=?
    WHERE id=?
  `; // query de atualização

  resolveServiceOrderId(service_order_id, budget_id, (err, resolvedServiceOrderId) => {
    if (err) return callback(err);

    db.run(
      sql,
      [
        client_id,
        budget_id || null,
        resolvedServiceOrderId || null,
        date,
        time,
        service,
        Number(price) || 0,
        status || 'scheduled',
        notes ?? null,
        durMin,
        id
      ],
      function (err2) {
        if (err2) return callback(err2);
        getById(id, callback); // retorna dados atualizados
      }
    );
  });
}

// exclui agendamento pelo id
function remove(id, callback) {
  db.run(
    'DELETE FROM appointments WHERE id = ?',
    [id],
    function (err) {
      if (err) return callback(err);
      callback(null, this.changes > 0); // true se houve exclusão
    }
  );
}

// lista agendamentos nos próximos dias
function upcoming(days = 7, callback) {
  const daysInt = Number.parseInt(String(days), 10); // parsea entrada
  const safeDays = Number.isFinite(daysInt) && daysInt > 0 ? daysInt : 7; // valor seguro

  const modifier = `+${safeDays} days`; // modificador para date()

  const sql = `
    SELECT a.*, c.name as client_name
    FROM appointments a
    LEFT JOIN clients c ON c.id = a.client_id
    WHERE a.date >= date('now')
      AND a.date <= date('now', ?)
      AND (a.status IS NULL OR a.status = 'scheduled')
    ORDER BY a.date ASC, a.time ASC
  `; // query com join para nome do cliente

  db.all(sql, [modifier], (err, rows) => {
    callback(err, rows || []); // retorna lista (vazia se null)
  });
}

// conta agendamentos do dia atual
function countToday(callback) {
  const sql =
    'SELECT COUNT(*) as count FROM appointments WHERE date = date("now")';

  db.get(sql, (err, row) => {
    if (err) return callback(err);
    callback(null, row?.count || 0); // retorna número
  });
}

// marca agendamento como concluído e cria transação financeira
function complete(appointmentId, callback) {
  db.serialize(() => {
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) return callback(err); // inicia transação

      db.get(
        `
        SELECT a.id, a.client_id, a.date, a.time,
               a.service, a.price, a.status,
               c.name as client_name
        FROM appointments a
        LEFT JOIN clients c ON a.client_id = c.id
        WHERE a.id = ?
        `,
        [appointmentId],
        (err, appointment) => {

          if (err) {
            db.run('ROLLBACK');
            return callback(err);
          }

          if (!appointment) {
            db.run('ROLLBACK');
            return callback(null, { exists: false }); // não existe
          }

          if (appointment.status === 'completed') {
            db.run('COMMIT', () => {
              callback(null, {
                exists: true,
                alreadyDone: true,
                transactionCreated: false
              }); // já concluído
            });
            return;
          }

          db.run(
            'UPDATE appointments SET status = ? WHERE id = ?',
            ['completed', appointmentId],
            (err) => {

              if (err) {
                db.run('ROLLBACK');
                return callback(err);
              }

              db.get(
                'SELECT id FROM transactions WHERE appointment_id = ?',
                [appointmentId],
                (err, existingTransaction) => {

                  if (err) {
                    db.run('ROLLBACK');
                    return callback(err);
                  }

                  if (!existingTransaction) {

                    const clientName =
                      appointment.client_name ||
                      `Cliente #${appointment.client_id}`; // nome do cliente

                    const description =
                      `Serviço: ${appointment.service} - ` +
                      `Cliente: ${clientName} - ` +
                      `Agendamento #${appointmentId}`; // descrição da transação

                    db.run(
                      `
                      INSERT INTO transactions
                      (type, category, description, amount, date, appointment_id)
                      VALUES (?, ?, ?, ?, ?, ?)
                      `,
                      [
                        'in',
                        'Tatuagem',
                        description,
                        appointment.price || 0,
                        appointment.date,
                        appointmentId
                      ],
                      (err) => {

                        if (err) {
                          db.run('ROLLBACK');
                          return callback(err);
                        }

                        db.run('COMMIT', () => {
                          callback(null, {
                            exists: true,
                            alreadyDone: false,
                            transactionCreated: true
                          }); // transação criada
                        });
                      }
                    );

                  } else {

                    db.run('COMMIT', () => {
                      callback(null, {
                        exists: true,
                        alreadyDone: false,
                        transactionCreated: false
                      }); // transação já existia
                    });

                  }
                }
              );
            }
          );
        }
      );
    });
  });
}

// marca uma sessão como completada (com material confirmado)
function completeSession(appointmentId, materialsUsed, callback) {
  // registra material usado (já existe função no materialService)
  const materialService = require('./materialService');
  
  // recebe array: [{ material_id, quantity }...]
  const sql = `UPDATE appointments SET is_completed = 1, status = 'completed' WHERE id = ?`;
  
  db.run(sql, [appointmentId], function(err) {
    if (err) return callback(err);
    
    // registra dados de material usado
    if (!materialsUsed || materialsUsed.length === 0) {
      return getById(appointmentId, callback);
    }
    
    // usar a função recordAppointmentMaterials do materialService para registrar tudo
    materialService.recordAppointmentMaterials(appointmentId, materialsUsed, (err2) => {
      if (err2) return callback(err2);
      getById(appointmentId, callback);
    });
  });
}

// cria nova sessão para próxima tatuagem no mesmo orçamento
function createNextSession(budgetId, appointmentData, callback) {
  // appointmentData deve conter: date, time, service, price, notes, duration_min
  // session_number será incrementado automaticamente
  
  db.get('SELECT MAX(session_number) as max_session FROM appointments WHERE budget_id = ?', [budgetId], (err, row) => {
    if (err) return callback(err);
    
    const nextSessionNum = (row?.max_session || 1) + 1;
    
    // adiciona budget_id e session_number aos dados
    const newAppointmentData = {
      ...appointmentData,
      budget_id: budgetId,
      session_number: nextSessionNum
    };
    
    create(newAppointmentData, callback);
  });
}

// marca orçamento como concluído (todas as sessões finalizadas)
function completeBudget(budgetId, callback) {
  db.get('SELECT sessions_count FROM budgets WHERE id = ?', [budgetId], (err, budget) => {
    if (err) return callback(err);
    if (!budget) return callback(new Error('Orçamento não encontrado'));
    
    const sql = `UPDATE budgets SET status = 'completed', sessions_completed = ? WHERE id = ?`;
    db.run(sql, [budget.sessions_count, budgetId], function(err2) {
      if (err2) return callback(err2);
      serviceOrderService.closeByBudget(budgetId, (err3, serviceOrder) => {
        if (err3) return callback(err3);
        callback(null, { success: true, service_order: serviceOrder });
      });
    });
  });
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  upcoming,
  countToday,
  checkConflict,
  complete,
  completeSession,
  createNextSession,
  completeBudget
};