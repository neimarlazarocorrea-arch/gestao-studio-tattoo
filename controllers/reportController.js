const reportService = require('../services/reportService');

function getIncomeExpenseReport(req, res) {
  const { start_date, end_date } = req.query;
  
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }
  
  reportService.getIncomeExpenseReport(start_date, end_date, (err, report) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(report);
  });
}

function getCashFlowReport(req, res) {
  const { year } = req.query;
  
  if (!year) {
    return res.status(400).json({ error: 'year is required' });
  }
  
  reportService.getCashFlowReport(year, (err, report) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(report);
  });
}

function getCategoryReport(req, res) {
  const { start_date, end_date } = req.query;
  
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }
  
  reportService.getCategoryReport(start_date, end_date, (err, report) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(report);
  });
}

function getBudgetReport(req, res) {
  reportService.getBudgetReport((err, report) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(report);
  });
}

function exportIncomeExpenseCSV(req, res) {
  const { start_date, end_date } = req.query;
  
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }
  
  reportService.getIncomeExpenseReport(start_date, end_date, (err, report) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const data = [
      { type: 'Receita', amount: report.income },
      { type: 'Despesa', amount: report.expense },
      { type: 'Lucro Líquido', amount: report.income - report.expense }
    ];
    
    reportService.generateCSV(data, ['type', 'amount'], (err, csv) => {
      if (err) return res.status(500).json({ error: err.message });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio-${start_date}-${end_date}.csv"`);
      res.send(csv);
    });
  });
}

function exportCategoryCSV(req, res) {
  const { start_date, end_date } = req.query;
  
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }
  
  reportService.getCategoryReport(start_date, end_date, (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    
    reportService.generateCSV(data, ['category', 'type', 'count', 'total'], (err, csv) => {
      if (err) return res.status(500).json({ error: err.message });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio-categorias-${start_date}-${end_date}.csv"`);
      res.send(csv);
    });
  });
}

function exportBudgetCSV(req, res) {
  reportService.getBudgetReport((err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    
    reportService.generateCSV(
      data,
      ['id', 'code', 'client', 'title', 'total_value', 'amount_paid', 'remaining', 'status', 'percentage_paid'],
      (err, csv) => {
        if (err) return res.status(500).json({ error: err.message });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="relatorio-orcamentos.csv"`);
        res.send(csv);
      }
    );
  });
}

function exportSummaryCSV(req, res) {
  reportService.getFinancialSummary((err, summary) => {
    if (err) return res.status(500).json({ error: err.message });

    const avgCycleDays = Number.isFinite(summary.serviceOrderCycleAvgDays)
      ? Number(summary.serviceOrderCycleAvgDays).toFixed(1)
      : '';

    const data = [{
      totalIncome: summary.totalIncome || 0,
      totalExpense: summary.totalExpense || 0,
      netProfit: summary.netProfit || 0,
      outstandingBudgets: summary.outstandingBudgets || 0,
      serviceOrderCycleAvgDays: avgCycleDays,
      serviceOrdersCompletedCount: summary.serviceOrdersCompletedCount || 0
    }];

    reportService.generateCSV(
      data,
      ['totalIncome', 'totalExpense', 'netProfit', 'outstandingBudgets', 'serviceOrderCycleAvgDays', 'serviceOrdersCompletedCount'],
      (err2, csv) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="relatorio-resumo-gerencial.csv"');
        res.send(csv);
      }
    );
  });
}

function getFinancialSummary(req, res) {
  reportService.getFinancialSummary((err, summary) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(summary);
  });
}

module.exports = {
  getIncomeExpenseReport,
  getCashFlowReport,
  getCategoryReport,
  getBudgetReport,
  exportIncomeExpenseCSV,
  exportCategoryCSV,
  exportBudgetCSV,
  exportSummaryCSV,
  getFinancialSummary
};
