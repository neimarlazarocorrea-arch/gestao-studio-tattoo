const db = require('../db/db');

// busca relatório de receitas (contas a receber)
function getReceivablesReport(callback) {
  const report = {
    total_outstanding: 0,
    by_status: {},
    by_client: [],
    summary: {}
  };

  db.serialize(() => {
    // total em aberto
    db.get(
      `SELECT 
        COUNT(*) as count,
        SUM(total_value - amount_paid) as total_outstanding,
        AVG(total_value - amount_paid) as avg_outstanding
       FROM budgets 
       WHERE status != 'completed' AND status != 'cancelled'`,
      [],
      (err, row) => {
        if (err) return callback(err);
        report.summary = {
          pending_count: row.count || 0,
          total_outstanding: row.total_outstanding || 0,
          avg_outstanding: row.avg_outstanding || 0
        };

        // agrupar por status
        db.all(
          `SELECT 
            status,
            COUNT(*) as count,
            SUM(total_value) as total_value,
            SUM(amount_paid) as total_paid,
            SUM(total_value - amount_paid) as total_outstanding
           FROM budgets 
           WHERE status != 'completed' AND status != 'cancelled'
           GROUP BY status`,
          [],
          (err2, rows2) => {
            if (err2) return callback(err2);
            rows2.forEach(row => {
              report.by_status[row.status] = {
                count: row.count,
                total_value: row.total_value,
                total_paid: row.total_paid,
                outstanding: row.total_outstanding
              };
            });

            // por cliente (ordenado por valor em aberto)
            db.all(
              `SELECT 
                c.id,
                c.name,
                COUNT(b.id) as budget_count,
                SUM(b.total_value) as total_value,
                SUM(b.amount_paid) as total_paid,
                SUM(b.total_value - b.amount_paid) as outstanding
               FROM clients c
               LEFT JOIN budgets b ON c.id = b.client_id 
               WHERE b.status != 'completed' AND b.status != 'cancelled'
               GROUP BY c.id, c.name
               ORDER BY outstanding DESC`,
              [],
              (err3, rows3) => {
                if (err3) return callback(err3);
                report.by_client = rows3 || [];

                // últimos 30 dias de movimentação
                db.all(
                  `SELECT 
                    DATE(t.date) as date,
                    SUM(CASE WHEN t.type='in' THEN t.amount ELSE 0 END) as income,
                    SUM(CASE WHEN t.type='out' THEN t.amount ELSE 0 END) as expense
                   FROM transactions t
                   WHERE t.date >= date('now', '-30 days')
                   GROUP BY DATE(t.date)
                   ORDER BY date DESC`,
                  [],
                  (err4, rows4) => {
                    if (err4) return callback(err4);
                    report.last_30_days = rows4 || [];
                    callback(null, report);
                  }
                );
              }
            );
          }
        );
      }
    );
  });
}

// busca orçamentos específicos com detalhes do cliente
function getPendingBudgets(callback) {
  db.all(
    `SELECT 
      b.id,
      b.code,
      b.client_id,
      c.name as client_name,
      c.email,
      c.phone,
      b.title,
      b.total_value,
      b.amount_paid,
      (b.total_value - b.amount_paid) as remaining,
      b.status,
      b.created_at,
      b.sessions_count,
      b.sessions_completed
     FROM budgets b
     JOIN clients c ON b.client_id = c.id
     WHERE b.status != 'completed' AND b.status != 'cancelled'
     ORDER BY (b.total_value - b.amount_paid) DESC`,
    [],
    (err, rows) => {
      callback(err, rows || []);
    }
  );
}

// busca clientes com débitos (para lembretes)
function getOverdueClients(callback) {
  db.all(
    `SELECT 
      c.id,
      c.name,
      c.email,
      c.phone,
      COUNT(b.id) as pending_budgets,
      SUM(b.total_value - b.amount_paid) as total_outstanding,
      MAX(b.created_at) as oldest_budget_date
     FROM clients c
     JOIN budgets b ON c.id = b.client_id
     WHERE b.status != 'completed' AND b.status != 'cancelled'
     GROUP BY c.id, c.name, c.email, c.phone
     ORDER BY total_outstanding DESC`,
    [],
    (err, rows) => {
      callback(err, rows || []);
    }
  );
}

module.exports = {
  getReceivablesReport,
  getPendingBudgets,
  getOverdueClients
};
