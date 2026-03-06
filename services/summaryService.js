const db = require('../db/db'); // instância do banco de dados

// gera um objeto resumo com várias métricas
function getSummary(callback) {
  const summary = {}; // acumula resultados
  db.serialize(() => {
    // total de clientes
    db.get('SELECT COUNT(*) as total FROM clients', [], (err, row) => {
      if (err) return callback(err);
      summary.totalClients = row.total;
      // próximos agendamentos nos próximos 7 dias
      db.all(
        `SELECT * FROM appointments WHERE date BETWEEN date('now') AND date('now', '+7 days') ORDER BY date, time`,
        [],
        (err2, rows2) => {
          if (err2) return callback(err2);
          summary.upcomingAppointments = rows2;
          // contagem de hoje
          db.get(
            `SELECT COUNT(*) as today FROM appointments WHERE date = date('now')`,
            [],
            (errToday, rowToday) => {
              if (errToday) return callback(errToday);
              summary.todayCount = rowToday.today;
              // itens com estoque baixo
              db.all(
                `
                SELECT
                  id,
                  name as item,
                  brand,
                  current_qty as qty,
                  min_qty,
                  'materials' as source
                FROM materials
                WHERE current_qty <= min_qty
                `,
                [],
                (err3, rows3) => {
                  if (err3) return callback(err3);
                  summary.lowStock = rows3;
                  // saldo financeiro
                  db.get(
                    "SELECT SUM(CASE WHEN type='in' THEN amount ELSE -amount END) as balance FROM transactions",
                    [],
                    (err4, row4) => {
                      if (err4) return callback(err4);
                      summary.balance = row4.balance || 0;
                      // também soma valores de orçamentos ainda não quitados
                      db.get(
                        "SELECT SUM(total_value - amount_paid) as outstanding FROM budgets WHERE status != 'completed' AND status != 'cancelled'",
                        [],
                        (err5, row5) => {
                          if (err5) return callback(err5);
                          summary.outstanding = row5.outstanding || 0;

                          db.get(
                            `
                            SELECT
                              AVG(julianday(COALESCE(completed_at, updated_at)) - julianday(COALESCE(accepted_at, created_at))) as avg_days,
                              COUNT(*) as completed_count
                            FROM service_orders
                            WHERE status = 'completed'
                              AND COALESCE(accepted_at, created_at) IS NOT NULL
                              AND COALESCE(completed_at, updated_at) IS NOT NULL
                            `,
                            [],
                            (err6, row6) => {
                              if (err6) return callback(err6);
                              const avg = row6 && row6.avg_days != null ? Number(row6.avg_days) : null;
                              summary.serviceOrderCycleAvgDays = Number.isFinite(avg) ? avg : null;
                              summary.serviceOrdersCompletedCount = row6 && row6.completed_count ? row6.completed_count : 0;
                              callback(null, summary); // retorna objeto completo
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  });
}

module.exports = { getSummary }; // exporta a função
