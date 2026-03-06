const receivablesService = require('../services/receivablesService');

function getReport(req, res) {
  receivablesService.getReceivablesReport((err, report) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(report);
  });
}

function getPending(req, res) {
  receivablesService.getPendingBudgets((err, budgets) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(budgets);
  });
}

function getOverdue(req, res) {
  receivablesService.getOverdueClients((err, clients) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(clients);
  });
}

module.exports = { getReport, getPending, getOverdue };
