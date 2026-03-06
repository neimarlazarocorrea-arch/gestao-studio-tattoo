const service = require('../services/appointmentService'); // importa o serviço de agendamentos
const auditService = require('../services/auditService');

function handleServiceError(res, err) {
  const message = err && err.message ? err.message : 'Erro interno';
  if (/not found|nao encontrado|não encontrado/i.test(message)) {
    return res.status(404).json({ error: message });
  }
  return res.status(500).json({ error: message });
}

// lista agendamentos conforme filtros de query string
exports.list = (req, res) => {
  service.list(req.query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message }); // erro no serviço
    res.json(rows); // retorna array de agendamentos
  });
};

// busca agendamento por id
exports.get = (req, res) => {
  service.getById(req.params.id, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Nao encontrado' }); // não encontrado
    res.json(row);
  });
};

// cria novo agendamento
exports.create = (req, res) => {
  const {
    client_id,
    date,
    time,
    service: serviceName,
    duration_min
  } = req.body; // extrai campos para checar conflito

  if (!client_id || !date || !time || !serviceName) {
    return res.status(400).json({
      error: 'client_id, date, time e service são obrigatórios'
    });
  }

  service.checkConflict(date, time, duration_min, null, (err, conflict) => {
    if (err) return res.status(500).json({ error: err.message });

    if (conflict) {
      return res.status(409).json({
        ok: false,
        error: 'Conflito de horário' // conflito detectado
      });
    }

    service.create(req.body, (err2, row) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ ok: true, data: row }); // retorna o agendamento criado
    });
  });
};

// atualiza agendamento existente
exports.update = (req, res) => {
  const id = req.params.id;
  const { date, time, duration_min } = req.body;

  service.checkConflict(date, time, duration_min, id, (err, conflict) => {
    if (err) return res.status(500).json({ error: err.message });

    if (conflict) {
      return res.status(409).json({
        ok: false,
        error: 'Conflito de horário' // conflito com outro agendamento
      });
    }

    service.update(id, req.body, (err2, row) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ ok: true, data: row }); // retorna dados atualizados
    });
  });
};

// remove um agendamento pelo id
exports.remove = (req, res) => {
  const appointmentId = req.params.id;
  service.remove(appointmentId, (err, ok) => {
    if (err) return res.status(500).json({ error: err.message });
    if (ok) {
      auditService.logFromRequest(req, {
        action: 'appointment.delete',
        entity_type: 'appointment',
        entity_id: Number(appointmentId)
      });
    }
    res.json({ ok }); // retorna {ok: true} se excluído
  });
};

// agenda próximos n dias
exports.upcoming = (req, res) => {
  service.upcoming(req.query.days, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, data: rows });
  });
};

// conta quantos agendamentos há hoje
exports.todayCount = (req, res) => {
  service.countToday((err, count) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, data: count });
  });
};

// marca um agendamento como concluído
exports.complete = (req, res) => {
  service.complete(req.params.id, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, data: result });
  });
};

// conclui sessão de tatuagem (registra materiais e marca como completo)
exports.completeSession = (req, res) => {
  const appointmentId = req.params.id;
  const materialsUsed = req.body.materials || []; // array: [{material_id, quantity}...]
  
  service.completeSession(appointmentId, materialsUsed, (err, result) => {
    if (err) return handleServiceError(res, err);
    res.json({ ok: true, data: result });
  });
};

// agenda próxima sessão para o mesmo orçamento
exports.createNextSession = (req, res) => {
  const budgetId = req.body.budget_id;
  const { client_id, date, time, service: serviceName } = req.body;

  if (!budgetId) {
    return res.status(400).json({ error: 'budget_id é obrigatório' });
  }

  if (!client_id || !date || !time || !serviceName) {
    return res.status(400).json({
      error: 'client_id, date, time e service são obrigatórios para próxima sessão'
    });
  }
  
  // dados do novo agendamento: date, time, service, price, notes, duration_min
  const appointmentData = {
    client_id: req.body.client_id,
    date: req.body.date,
    time: req.body.time,
    service: req.body.service,
    price: req.body.price,
    duration_min: req.body.duration_min,
    notes: req.body.notes
  };
  
  service.createNextSession(budgetId, appointmentData, (err, result) => {
    if (err) return handleServiceError(res, err);
    res.status(201).json({ ok: true, data: result });
  });
};

// marca orçamento como completamente concluído
exports.completeBudget = (req, res) => {
  const budgetId = req.params.budgetId;
  
  service.completeBudget(budgetId, (err, result) => {
    if (err) return handleServiceError(res, err);
    res.json({ ok: true, data: result });
  });
};