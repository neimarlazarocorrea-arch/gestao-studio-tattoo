const transactionService = require('../services/transactionService'); // importa serviço de transações
const receiptService = require('../services/receiptService'); // importa serviço de recibos
const auditService = require('../services/auditService');

function list(req, res) {
  transactionService.getAll(req.query || {}, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message }); // erro ao buscar
    res.json(rows); // retorna todas as transações
  });
}

function get(req, res) {
  const id = req.params.id;
  transactionService.getById(id, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Transaction not found' }); // não existe
    res.json(row); // retorna a transação
  });
}

const budgetService = require('../services/budgetService');

async function create(req, res) {
  let data = req.body; // dados da nova transação

  // se veio budget_id vamos buscar e completar informações
  if (data.budget_id) {
    return budgetService.getById(data.budget_id, (err, budget) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!budget) return res.status(400).json({ error: 'Budget not found' });
      // preencher valores padrão caso não enviados
      data.type = 'in';
      data.category = data.category || 'Orçamento';
      data.description = data.description || `Recebimento de orçamento #${budget.id}`;
      // possível pagamento parcial: usa amount enviado ou valor restante
      const remaining = (budget.total_value || 0) - (budget.amount_paid || 0);
      data.amount = data.amount || remaining;
      data.date = data.date || new Date().toISOString().split('T')[0];

      // validamos e criamos transação
      if (data.amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });
      if (data.amount > remaining) {
        // permitir pagar mais que o restante, mas avisar?
        // aqui apenas limitar ao restante
        data.amount = remaining;
      }
      transactionService.create(data, (err2, newRow) => {
        if (err2) return res.status(500).json({ error: err2.message });
        // atualizar valor pago e status do orçamento
        budgetService.recordPayment(budget.id, data.amount, () => {
          // criar recibo automaticamente
          const receiptData = {
            type: 'income',
            reference_type: 'budget',
            reference_id: budget.id,
            amount: data.amount,
            date: data.date,
            description: data.description,
            notes: `Recibo de pagamento de orçamento #${budget.id}`
          };
          receiptService.createReceipt(receiptData, (err3) => {
            // ignorar erro na criação do recibo
            res.status(201).json(newRow);
          });
        });
      });
    });
  }

  if (data.amount <= 0) return res.status(400).json({ error: 'Amount must be positive' }); // valor deve ser positivo
  if (data.type !== 'in' && data.type !== 'out') return res.status(400).json({ error: 'Type must be in or out' }); // tipo inválido
  transactionService.create(data, (err, newRow) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json(newRow); // transação criada
  });
}

function update(req, res) {
  const id = req.params.id;
  const data = req.body;
  if (data.amount != null && data.amount <= 0) return res.status(400).json({ error: 'Amount must be positive' }); // valida alteração
  transactionService.update(id, data, (err, updated) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(updated); // retorna transação atualizada
  });
}

function remove(req, res) {
  const id = req.params.id;
  transactionService.remove(id, (err, deleted) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!deleted) return res.status(404).json({ error: 'Transaction not found' }); // nada para excluir
    auditService.logFromRequest(req, {
      action: 'transaction.delete',
      entity_type: 'transaction',
      entity_id: Number(id)
    });
    res.status(204).send(); // excluído com sucesso
  });
}

module.exports = { list, get, create, update, remove }; // exporta os manipuladores
