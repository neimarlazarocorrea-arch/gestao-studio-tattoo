// controller de materiais - manipula requisições HTTP relacionadas ao controle de estoque

const materialService = require('../services/materialService'); // importa serviço de materiais

// lista todos os materiais, ou busca por nome quando query ?q= é fornecida
function list(req, res) {
  const q = req.query.q;
  if (q) {
    materialService.searchByName(q, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  } else {
    materialService.getAll((err, rows) => {
      if (err) return res.status(500).json({ error: err.message }); // erro ao buscar
      res.json(rows); // retorna lista de materiais
    });
  }
}

// busca material por id
function get(req, res) {
  const id = req.params.id;
  materialService.getById(id, (err, material) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!material) return res.status(404).json({ error: 'Material não encontrado' }); // não existe
    res.json(material); // retorna material
  });
}

// lista materiais com estoque baixo
function getLowStock(req, res) {
  materialService.getLowStock((err, materials) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(materials); // retorna materiais com estoque baixo
  });
}

// cria novo material
function create(req, res) {
  const data = req.body; // dados do material
  
  if (!data || !data.name) {
    return res.status(400).json({ error: 'Nome do material é obrigatório' });
  }
  
  materialService.create(data, (err, material) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json(material); // material criado
  });
}

// atualiza material existente
function update(req, res) {
  const id = req.params.id;
  const data = req.body;
  
  materialService.update(id, data, (err, material) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(material); // retorna dados atualizados
  });
}

// exclui material
function remove(req, res) {
  const id = req.params.id;
  materialService.remove(id, (err, deleted) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!deleted) return res.status(404).json({ error: 'Material não encontrado' }); // nada para excluir
    res.status(204).send(); // excluído com sucesso
  });
}

// registra entrada de material (compra)
function recordEntry(req, res) {
  const { material_id, quantity, notes } = req.body;
  
  if (!material_id || !quantity) {
    return res.status(400).json({ error: 'material_id e quantity são obrigatórios' });
  }
  
  materialService.recordEntry(material_id, quantity, notes, (err, material) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, data: material });
  });
}

// registra saída de material
function recordExit(req, res) {
  const { material_id, quantity, reason, notes } = req.body;
  
  if (!material_id || !quantity) {
    return res.status(400).json({ error: 'material_id e quantity são obrigatórios' });
  }
  
  materialService.recordExit(material_id, quantity, reason, notes, (err, material) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, data: material });
  });
}

// registra uso de material em tatuagem
function recordUsage(req, res) {
  const { material_id, appointment_id, quantity_used, notes } = req.body;
  
  if (!material_id || !appointment_id || !quantity_used) {
    return res.status(400).json({ error: 'material_id, appointment_id e quantity_used são obrigatórios' });
  }
  
  materialService.recordUsage(material_id, appointment_id, quantity_used, notes, (err, material) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, data: material });
  });
}

// retorna histórico de movimentações
function getMovementHistory(req, res) {
  const materialId = req.params.id;
  materialService.getMovementHistory(materialId, (err, movements) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(movements);
  });
}

// retorna histórico de uso
function getUsageHistory(req, res) {
  const materialId = req.params.id;
  materialService.getUsageHistory(materialId, (err, usages) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(usages);
  });
}

module.exports = { 
  list, 
  get,
  getLowStock,
  create, 
  update, 
  remove,
  recordEntry,
  recordExit,
  recordUsage,
  getMovementHistory,
  getUsageHistory
}; // exporta handlers
