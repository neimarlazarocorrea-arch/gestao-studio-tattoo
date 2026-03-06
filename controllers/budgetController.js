// controller de orçamentos - manipula requisições HTTP relacionadas a orçamentos

const budgetService = require('../services/budgetService'); // importa serviço de orçamentos
const auditService = require('../services/auditService');

// lista todos os orçamentos (aceita ?status=active|completed|cancelled)
function list(req, res) {
  const status = req.query.status;
  budgetService.getAll((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (status) {
      rows = rows.filter(r => r.status === status);
    }
    res.json(rows);
  });
}

// busca orçamento por id
function get(req, res) {
  const id = req.params.id;
  budgetService.getById(id, (err, budget) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!budget) return res.status(404).json({ error: 'Orçamento não encontrado' }); // não existe
    res.json(budget); // retorna orçamento com materiais
  });
}

// lista orçamentos de um cliente
function getByClient(req, res) {
  const clientId = req.params.clientId;
  budgetService.getByClientId(clientId, (err, budgets) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(budgets); // retorna orçamentos do cliente
  });
}

// cria novo orçamento
function create(req, res) {
  const data = req.body; // dados do orçamento
  
  // validação simples
  if (!data || !data.client_id || !data.title) {
    return res.status(400).json({ error: 'cliente e título são obrigatórios' });
  }
  // materiais, se presentes, devem conter pelo menos nome ou material_id
  if (data.materials && !Array.isArray(data.materials)) {
    return res.status(400).json({ error: 'materiais deve ser um array' });
  }
  if (data.materials) {
    for (const m of data.materials) {
      if (!m.item_name && !m.material_id) {
        return res.status(400).json({ error: 'cada material precisa de item_name ou material_id' });
      }
    }
  }
  
  budgetService.create(data, (err, budget) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json(budget); // orçamento criado
  });
}

// atualiza orçamento existente
function update(req, res) {
  const id = req.params.id;
  const data = req.body;
  
  if (data.materials && !Array.isArray(data.materials)) {
    return res.status(400).json({ error: 'materiais deve ser um array' });
  }
  if (data.materials) {
    for (const m of data.materials) {
      if (!m.item_name && !m.material_id) {
        return res.status(400).json({ error: 'cada material precisa de item_name ou material_id' });
      }
    }
  }

  budgetService.update(id, data, (err, budget) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(budget); // retorna dados atualizados
  });
}

// exclui orçamento
function remove(req, res) {
  const id = req.params.id;
  budgetService.remove(id, (err, deleted) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!deleted) return res.status(404).json({ error: 'Orçamento não encontrado' }); // nada para excluir
    res.status(204).send(); // excluído com sucesso
  });
}

// fecha orçamento e cria OS automaticamente
function close(req, res) {
  const id = req.params.id;
  budgetService.close(id, (err, result) => {
    if (err) {
      if (/não encontrado|nao encontrado|not found/i.test(err.message || '')) {
        return res.status(404).json({ error: err.message });
      }
      if (/nao e possivel fechar o orcamento|ordem de servico vinculada|OS em status/i.test(err.message || '')) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message });
    }
    auditService.logFromRequest(req, {
      action: 'budget.close',
      entity_type: 'budget',
      entity_id: Number(id),
      details: {
        service_order_id: result && result.service_order ? result.service_order.id : null
      }
    });
    res.json(result);
  });
}

module.exports = { list, get, getByClient, create, update, remove, close }; // exporta handlers
