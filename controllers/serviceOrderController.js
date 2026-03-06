const serviceOrderService = require('../services/serviceOrderService');
const auditService = require('../services/auditService');

function list(req, res) {
  serviceOrderService.getAll(req.query || {}, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
}

function get(req, res) {
  serviceOrderService.getById(req.params.id, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'OS não encontrada' });
    res.json(row);
  });
}

function createFromBudget(req, res) {
  const budgetId = req.params.budgetId;
  serviceOrderService.createFromBudget(budgetId, (err, row) => {
    if (err) {
      if (/não encontrado|nao encontrado|not found/i.test(err.message || '')) {
        return res.status(404).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json(row);
  });
}

function updateStatus(req, res) {
  const id = req.params.id;
  const status = req.body && req.body.status;
  if (!status) return res.status(400).json({ error: 'status é obrigatório' });

  serviceOrderService.updateStatus(id, status, (err, row) => {
    if (err) {
      const msg = err.message || '';
      if (/não encontrada|nao encontrada|not found/i.test(msg)) {
        return res.status(404).json({ error: msg });
      }
      if (/inválido|invalido|inválida|invalida|finalizada|transicao/i.test(msg)) {
        return res.status(400).json({ error: msg });
      }
      return res.status(500).json({ error: msg });
    }
    auditService.logFromRequest(req, {
      action: 'service_order.update_status',
      entity_type: 'service_order',
      entity_id: Number(id),
      details: { status }
    });
    res.json(row);
  });
}

module.exports = {
  list,
  get,
  createFromBudget,
  updateStatus
};
