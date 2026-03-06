const db = require('../db/db');

// relatório de receitas vs despesas por período
function getIncomeExpenseReport(startDate, endDate, callback) {
  const sql = `
    SELECT 
      type,
      COUNT(*) as count,
      SUM(amount) as total
    FROM transactions
    WHERE date >= ? AND date <= ?
    GROUP BY type
  `;
  
  db.all(sql, [startDate, endDate], (err, rows) => {
    if (err) return callback(err);
    
    const result = { income: 0, expense: 0 };
    rows.forEach(row => {
      if (row.type === 'in') result.income = row.total || 0;
      if (row.type === 'out') result.expense = row.total || 0;
    });
    
    callback(null, result);
  });
}

// relatório mensário de fluxo de caixa
function getCashFlowReport(year, callback) {
  const sql = `
    SELECT 
      SUBSTR(date, 1, 7) as month,
      type,
      SUM(amount) as total
    FROM transactions
    WHERE SUBSTR(date, 1, 4) = ?
    GROUP BY SUBSTR(date, 1, 7), type
    ORDER BY month ASC
  `;
  
  db.all(sql, [year], (err, rows) => {
    if (err) return callback(err);
    
    const result = {};
    rows.forEach(row => {
      if (!result[row.month]) {
        result[row.month] = { income: 0, expense: 0, net: 0 };
      }
      if (row.type === 'in') result[row.month].income = row.total || 0;
      if (row.type === 'out') result[row.month].expense = row.total || 0;
      result[row.month].net = result[row.month].income - result[row.month].expense;
    });
    
    callback(null, result);
  });
}

// relatório por categoria
function getCategoryReport(startDate, endDate, callback) {
  const sql = `
    SELECT 
      category,
      type,
      COUNT(*) as count,
      SUM(amount) as total
    FROM transactions
    WHERE date >= ? AND date <= ?
    GROUP BY category, type
    ORDER BY total DESC
  `;
  
  db.all(sql, [startDate, endDate], (err, rows) => {
    callback(err, rows || []);
  });
}

// relatório de orçamentos
function getBudgetReport(callback) {
  const sql = `
    SELECT 
      b.id,
      b.code,
      c.name as client,
      b.title,
      b.total_value,
      b.amount_paid,
      (b.total_value - b.amount_paid) as remaining,
      b.status,
      b.created_at,
      ROUND((b.amount_paid * 100.0 / b.total_value), 2) as percentage_paid
    FROM budgets b
    LEFT JOIN clients c ON b.client_id = c.id
    ORDER BY b.created_at DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    callback(err, rows || []);
  });
}

// exportação em CSV
function generateCSV(data, headers, callback) {
  try {
    let csv = headers.join(',') + '\n';
    data.forEach(row => {
      const values = headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && val.includes(',')) {
          return `"${val}"`;
        }
        return val;
      });
      csv += values.join(',') + '\n';
    });
    callback(null, csv);
  } catch (err) {
    callback(err);
  }
}

// resumo financeiro geral
function getFinancialSummary(callback) {
  db.serialize(function() {
    db.get(
      `SELECT SUM(amount) as total FROM transactions WHERE type='in'`,
      [],
      (err, incomeRow) => {
        if (err) return callback(err);
        
        db.get(
          `SELECT SUM(amount) as total FROM transactions WHERE type='out'`,
          [],
          (err, expenseRow) => {
            if (err) return callback(err);
            
            db.get(
              `SELECT SUM(total_value - amount_paid) as outstanding FROM budgets WHERE status != 'completed'`,
              [],
              (err, outstandingRow) => {
                if (err) return callback(err);
                
                const summary = {
                  totalIncome: incomeRow?.total || 0,
                  totalExpense: expenseRow?.total || 0,
                  netProfit: (incomeRow?.total || 0) - (expenseRow?.total || 0),
                  outstandingBudgets: outstandingRow?.outstanding || 0
                };

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
                  (err2, cycleRow) => {
                    if (err2) return callback(err2);
                    const avgDays = cycleRow && cycleRow.avg_days != null ? Number(cycleRow.avg_days) : null;
                    summary.serviceOrderCycleAvgDays = Number.isFinite(avgDays) ? avgDays : null;
                    summary.serviceOrdersCompletedCount = cycleRow?.completed_count || 0;
                    callback(null, summary);
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

module.exports = {
  getIncomeExpenseReport,
  getCashFlowReport,
  getCategoryReport,
  getBudgetReport,
  generateCSV,
  getFinancialSummary
};
