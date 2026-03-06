// mantém os controllers enxutos; repassa a lógica para o serviço

const clientService = require('../services/clientService'); // importa serviço de clientes
const auditService = require('../services/auditService');

function listClients(req, res) {
  clientService.getAll(req.query || {}, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message }); // erro ao buscar
    res.json(rows); // retorna lista de clientes
  });
}

function getClient(req, res) {
  const id = req.params.id; // pega id da rota
  clientService.getById(id, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Client not found' }); // não encontrado
    res.json(row); // retorna cliente
  });
}

function createClient(req, res) {
  const data = req.body; // dados do cliente enviados no body
  if (!data || !data.name) {
    return res.status(400).json({ error: 'Name is required' }); // validação simples
  }
  clientService.create(data, (err, newRow) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json(newRow); // cliente criado com sucesso
  });
}

function updateClient(req, res) {
  const id = req.params.id;
  const data = req.body || {};
  if (!data.name) return res.status(400).json({ error: 'Name is required' });

  clientService.update(id, data, (err, updated) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!updated) return res.status(404).json({ error: 'Client not found' });
    auditService.logFromRequest(req, {
      action: 'client.update',
      entity_type: 'client',
      entity_id: Number(id)
    });
    res.json(updated);
  });
}

function deleteClient(req, res) {
  const id = req.params.id;
  clientService.remove(id, (err, deleted) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!deleted) return res.status(404).json({ error: 'Client not found' }); // nada foi removido
    auditService.logFromRequest(req, {
      action: 'client.delete',
      entity_type: 'client',
      entity_id: Number(id)
    });
    res.status(204).send(); // removido sem conteúdo
  });
}

module.exports = {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient
}; // exporta os handlers para as rotas
