const receiptService = require('../services/receiptService');

function create(req, res) {
  const data = req.body;
  
  if (!data.reference_id || !data.reference_type || !data.amount) {
    return res.status(400).json({ error: 'reference_id, reference_type, and amount are required' });
  }

  receiptService.createReceipt(data, (err, receipt) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json(receipt);
  });
}

function get(req, res) {
  const id = req.params.id;
  receiptService.getById(id, (err, receipt) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
    res.json(receipt);
  });
}

function list(req, res) {
  const filters = {
    type: req.query.type,
    reference_type: req.query.reference_type,
    start_date: req.query.start_date,
    end_date: req.query.end_date
  };

  receiptService.getAll(filters, (err, receipts) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(receipts);
  });
}

function getByBudget(req, res) {
  const budgetId = req.params.budgetId;
  receiptService.getByBudget(budgetId, (err, receipts) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(receipts);
  });
}

function getByTransaction(req, res) {
  const transactionId = req.params.transactionId;
  receiptService.getByTransaction(transactionId, (err, receipts) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(receipts);
  });
}

function remove(req, res) {
  const id = req.params.id;
  receiptService.remove(id, (err, deleted) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!deleted) return res.status(404).json({ error: 'Receipt not found' });
    res.status(204).send();
  });
}

module.exports = { create, get, list, getByBudget, getByTransaction, remove };
