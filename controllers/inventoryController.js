const inventoryService = require('../services/inventoryService'); // serviço de inventário
const { promisify } = require('util');

// promisify para usar async/await e reduzir nesting de callbacks
const getAll = promisify(inventoryService.getAll.bind(inventoryService));
const getById = promisify(inventoryService.getById.bind(inventoryService));
const createItem = promisify(inventoryService.create.bind(inventoryService));
const updateItem = promisify(inventoryService.update.bind(inventoryService));
const removeItem = promisify(inventoryService.remove.bind(inventoryService));

// helpers para respostas comuns
function handleError(res, err) {
  console.error(err);
  return res.status(500).json({ error: err.message || 'Internal server error' });
}

async function list(req, res) {
  try {
    const rows = await getAll();
    res.json(rows);
  } catch (err) {
    handleError(res, err);
  }
}

async function get(req, res) {
  const id = req.params.id;
  try {
    const row = await getById(id);
    if (!row) return res.status(404).json({ error: 'Item not found' });
    res.json(row);
  } catch (err) {
    handleError(res, err);
  }
}

async function create(req, res) {
  const data = req.body;
  if (data.qty != null && data.qty < 0) {
    return res.status(400).json({ error: 'Quantity cannot be negative' });
  }

  try {
    const newRow = await createItem(data);
    res.status(201).json(newRow);
  } catch (err) {
    handleError(res, err);
  }
}

async function update(req, res) {
  const id = req.params.id;
  const data = req.body;

  if (data.qty != null && data.qty < 0) {
    return res.status(400).json({ error: 'Quantity cannot be negative' });
  }

  try {
    const updated = await updateItem(id, data);
    res.json(updated);
  } catch (err) {
    handleError(res, err);
  }
}

async function remove(req, res) {
  const id = req.params.id;
  try {
    const deleted = await removeItem(id);
    if (!deleted) return res.status(404).json({ error: 'Item not found' });
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
}

module.exports = { list, get, create, update, remove }; // exporta handlers
