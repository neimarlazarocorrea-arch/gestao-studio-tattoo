const reminderService = require('../services/reminderService');
const budgetService = require('../services/budgetService');

function create(req, res) {
  const data = req.body;
  
  if (!data.budget_id || !data.client_id) {
    return res.status(400).json({ error: 'budget_id and client_id are required' });
  }

  reminderService.createReminder(data, (err, reminder) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json(reminder);
  });
}

function getById(req, res) {
  const id = req.params.id;
  reminderService.getById(id, (err, reminder) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
    res.json(reminder);
  });
}

function list(req, res) {
  const filters = {
    status: req.query.status,
    reminder_type: req.query.reminder_type,
    budget_id: req.query.budget_id,
    client_id: req.query.client_id
  };

  reminderService.getAll(filters, (err, reminders) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(reminders);
  });
}

function getPending(req, res) {
  reminderService.getPending((err, reminders) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(reminders);
  });
}

function updateStatus(req, res) {
  const id = req.params.id;
  const { status, sent_date } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'status is required' });
  }

  reminderService.updateStatus(id, status, sent_date, (err, reminder) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(reminder);
  });
}

function generateReminders(req, res) {
  reminderService.generatePendingReminders((err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, result });
  });
}

function remove(req, res) {
  const id = req.params.id;
  reminderService.remove(id, (err, deleted) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!deleted) return res.status(404).json({ error: 'Reminder not found' });
    res.status(204).send();
  });
}

module.exports = { create, getById, list, getPending, updateStatus, generateReminders, remove };
