// script de gerenciamento da agenda

let clientsCache = []; // cache de clientes
let budgetsCache = []; // cache de orçamentos
let serviceOrdersCache = []; // cache de ordens de serviço
let editingId = null; // id do agendamento em edição
let currentFilter = 'week'; // filtro atual (semana por padrão)
let contextBudgetId = null;
let contextServiceOrderId = null;

// carrega clientes da API e popula select
async function loadClients() {
  try {
    const data = await apiRequest('/api/clients');

    clientsCache = Array.isArray(data) ? data : [];
    
    const sel = document.querySelector('select[name=client_id]');
    sel.innerHTML = '<option value="">-- selecione --</option>';
    clientsCache.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
  } catch (err) {
    console.error('Erro ao carregar clientes:', err);
  }
}

// carrega ordens de serviço para resolver código da OS na tabela da agenda
async function loadServiceOrders() {
  try {
    const data = await apiRequest('/api/service-orders');
    serviceOrdersCache = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Erro ao carregar ordens de serviço:', err);
    serviceOrdersCache = [];
  }
}

// carrega orçamentos da API e popula select
async function loadBudgets() {
  try {
    const data = await apiRequest('/api/budgets');

    budgetsCache = Array.isArray(data) ? data : [];
    
    const sel = document.querySelector('select[name=budget_id]');
    sel.innerHTML = '<option value="">-- Sem orçamento --</option>';
    // filtra apenas orçamentos ativos
    budgetsCache.filter(b => b.status === 'active').forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = `${b.code} - ${b.title}`;
      sel.appendChild(opt);
    });

    // listener auto preencher cliente ao escolher orçamento
    sel.onchange = function() {
      const bid = this.value;
      if (bid) {
        const budget = budgetsCache.find(x => x.id == bid);
        if (budget && budget.client_id) {
          const clientSel = document.querySelector('select[name=client_id]');
          clientSel.value = budget.client_id;
        }
      }
    };
  } catch (err) {
    console.error('Erro ao carregar orçamentos:', err);
  }
}

// obtém código do orçamento a partir do id
function getBudgetCode(budgetId) {
  if (!budgetId) return '--';
  const budget = budgetsCache.find(b => b.id == budgetId);
  return budget ? budget.code : `Orç. #${budgetId}`;
}

function getServiceOrderCode(serviceOrderId, budgetId) {
  if (serviceOrderId) {
    const so = serviceOrdersCache.find(s => s.id == serviceOrderId);
    if (so && so.code) return so.code;
    return `OS #${serviceOrderId}`;
  }

  if (budgetId) {
    const soByBudget = serviceOrdersCache.find(s => s.budget_id == budgetId);
    if (soByBudget && soByBudget.code) return soByBudget.code;
    return '--';
  }

  return '--';
}

function getServiceOrderMeta(serviceOrderId, budgetId) {
  let so = null;

  if (serviceOrderId) {
    so = serviceOrdersCache.find(s => s.id == serviceOrderId) || null;
  }

  if (!so && budgetId) {
    so = serviceOrdersCache.find(s => s.budget_id == budgetId) || null;
  }

  if (!so) {
    return {
      code: '--',
      status: null,
      progressText: '--'
    };
  }

  return {
    code: so.code || `OS #${so.id}`,
    status: so.status || null,
    progressText: `${so.sessions_completed || 0}/${so.sessions_count || 0}`
  };
}

function captureUrlContext() {
  const params = new URLSearchParams(window.location.search);
  const budgetId = params.get('budget_id');
  const serviceOrderId = params.get('service_order_id');

  contextBudgetId = budgetId && /^\d+$/.test(budgetId) ? budgetId : null;
  contextServiceOrderId = serviceOrderId && /^\d+$/.test(serviceOrderId) ? serviceOrderId : null;
}

function renderContextBar() {
  const bar = document.getElementById('agendaContextBar');
  const text = document.getElementById('agendaContextText');
  if (!bar || !text) return;

  const parts = [];
  if (contextServiceOrderId) parts.push(`OS #${contextServiceOrderId}`);
  if (contextBudgetId) parts.push(`Orcamento #${contextBudgetId}`);

  if (!parts.length) {
    bar.hidden = true;
    text.textContent = '';
    return;
  }

  text.textContent = `Filtro de contexto ativo: ${parts.join(' | ')}`;
  bar.hidden = false;
}

function clearAgendaContextFilter() {
  contextBudgetId = null;
  contextServiceOrderId = null;

  const url = new URL(window.location.href);
  url.searchParams.delete('budget_id');
  url.searchParams.delete('service_order_id');
  window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));

  renderContextBar();
  notify('Filtro de contexto removido', 'info');
  listAppointments(currentFilter);
}

function applyUrlContextToForm() {
  if (!contextBudgetId) return;

  const budgetSelect = document.querySelector('select[name=budget_id]');
  if (!budgetSelect) return;

  const optionExists = Array.from(budgetSelect.options).some(o => o.value === String(contextBudgetId));
  if (!optionExists) {
    const budget = budgetsCache.find(b => String(b.id) === String(contextBudgetId));
    if (budget) {
      const opt = document.createElement('option');
      opt.value = String(budget.id);
      opt.textContent = `${budget.code || `#${budget.id}`} - ${budget.title || 'Orçamento'}`;
      budgetSelect.appendChild(opt);
    }
  }

  budgetSelect.value = String(contextBudgetId);
  if (typeof budgetSelect.onchange === 'function') budgetSelect.onchange();

  if (contextServiceOrderId) {
    notify(`Contexto aplicado: OS #${contextServiceOrderId} vinculada ao orçamento`, 'info', 4200);
  }

  renderContextBar();
}

// obtém nome do cliente a partir do id, usando cache
function getClientName(clientId) {
  const client = clientsCache.find(c => c.id == clientId);
  return client ? client.name : `Cliente #${clientId}`; // fallback
}

// lista agendamentos conforme filtro (hoje, semana ou todos)
async function listAppointments(filter) {
  try {
    const now = new Date();
    const params = new URLSearchParams();

    if (filter === 'today') {
      const today = now.toISOString().slice(0, 10);
      params.set('from', today);
      params.set('to', today);
    } else if (filter === 'week') {
      const from = now.toISOString().slice(0, 10);
      const toDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
      const to = toDate.toISOString().slice(0, 10);
      params.set('from', from);
      params.set('to', to);
    }

    if (contextServiceOrderId) {
      params.set('service_order_id', String(contextServiceOrderId));
    }

    const query = params.toString();
    const url = query ? `/api/appointments?${query}` : '/api/appointments';
    
    const data = await apiRequest(url);
    const appointments = Array.isArray(data) ? data : [];
    const tbody = document.querySelector('#agendaTable tbody');
    tbody.innerHTML = '';
    
    if (appointments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" style="text-align: center;">Nenhum agendamento encontrado</td></tr>';
      return;
    }
    
    appointments.forEach(a => {
      const tr = document.createElement('tr');
      const clientName = getClientName(a.client_id);
      const budgetCode = getBudgetCode(a.budget_id);
      const soMeta = getServiceOrderMeta(a.service_order_id, a.budget_id);
      const statusLabel = {
        'scheduled': 'Agendado',
        'done': 'Concluído',
        'completed': 'Concluído',
        'canceled': 'Cancelado',
        'cancelled': 'Cancelado'
      }[a.status] || a.status; // rótulo legível

      if (soMeta.status === 'in_progress') {
        tr.classList.add('agenda-row-so-progress');
      }
      
      const finishAction = a.is_completed
        ? '<span class="agenda-state-ok">Material confirmado</span>'
        : `<button class="action-btn success finish-session" data-id="${a.id}" data-budget_id="${a.budget_id}">Finalizar Sessao</button>`;

      tr.innerHTML = `<td>${a.id}</td><td>${clientName}</td><td>${budgetCode}</td><td><div class="os-cell"><span>${soMeta.code}</span><span class="os-progress">${soMeta.progressText}</span></div></td><td>${a.date}</td><td>${a.time}</td><td>${a.duration_min || 180}</td><td>${a.service}</td><td>${a.price !== null ? a.price.toFixed(2) : '0.00'}</td><td>${statusLabel}</td><td><div class="agenda-actions">${finishAction}<button class="action-btn edit" data-id="${a.id}">Editar</button><button class="action-btn danger delete" data-id="${a.id}">Excluir</button></div></td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Erro ao listar agendamentos:', err);
  }
}

// vincula manipuladores de clique na tabela
function bindTableActions() {
  document.querySelector('#agendaTable').addEventListener('click', async e => {
    if (e.target.matches('.edit')) {
      const id = e.target.dataset.id;
      try {
        const appointment = await apiRequest('/api/appointments/' + id);
        fillForm(appointment); // preenche formulário para edição
        document.getElementById('agendaForm').scrollIntoView({ behavior: 'smooth' });
      } catch (err) {
        console.error('Erro ao editar:', err);
        notify(formatUiError(err, 'Erro ao carregar agendamento'), 'error');
      }
    }
    if (e.target.matches('.delete')) {
      const id = e.target.dataset.id;
      if (!confirm('Deseja excluir esse agendamento?')) return;
      try {
        await apiRequest('/api/appointments/' + id, { method: 'DELETE' });
        listAppointments(currentFilter); // recarrega tabela
      } catch (err) {
        console.error('Erro ao excluir:', err);
        notify(formatUiError(err, 'Erro ao excluir agendamento'), 'error');
      }
    }
    if (e.target.matches('.finish-session')) {
      const id = e.target.dataset.id;
      const budgetId = e.target.dataset.budget_id;
      
      // busca os materiais do orçamento
      try {
        const budget = await apiRequest('/api/budgets/' + budgetId);
        
        if (!budget || !budget.materials) {
          notify('Nao foi possivel carregar os materiais do orcamento', 'warning');
          return;
        }
        
        showFinishSessionDialog(id, budget, budgetId);
      } catch (err) {
        console.error('Erro ao carregar orçamento:', err);
        notify(formatUiError(err, 'Erro ao carregar dados do orcamento'), 'error');
      }
    }
  });
}

// preenche o formulário de agendamento com dados
function fillForm(a) {
  editingId = a.id;
  const f = document.getElementById('agendaForm');
  f.client_id.value = a.client_id;
  f.budget_id.value = a.budget_id || '';  // se houver orçamento e cliente vazio, preenche cliente automaticamente
  if (a.budget_id && !a.client_id) {
    const budget = budgetsCache.find(b => b.id == a.budget_id);
    if (budget) f.client_id.value = budget.client_id;
  }  f.date.value = a.date;
  f.time.value = a.time;
  f.duration_min.value = a.duration_min || 180;
  f.service.value = a.service;
  f.price.value = a.price || '';
  f.status.value = a.status || 'scheduled';
  f.notes.value = a.notes || '';
}

// limpa formulário e estado de edição
function clearForm() {
  editingId = null;
  const f = document.getElementById('agendaForm');
  f.reset();
}

function bindAgendaAuthButton() {
  const btn = document.getElementById('agendaAuthBtn');
  if (!btn) return;

  function refresh() {
    btn.textContent = window.hasApiAuth && window.hasApiAuth() ? 'Sair API' : 'Entrar API';
  }

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (window.hasApiAuth && window.hasApiAuth()) {
      window.logoutApiAuth();
      refresh();
      return;
    }

    const ok = window.loginApiAuthInteractive && await window.loginApiAuthInteractive();
    refresh();
    if (ok) {
      listAppointments(currentFilter);
    }
  });

  const authEvent = window.API_AUTH_CHANGED_EVENT || 'api-auth-changed';
  window.addEventListener(authEvent, refresh);

  refresh();
}

// mostra diálogo para finalizar sessão (confirmar material e oferecer opções)
function showFinishSessionDialog(appointmentId, budget, budgetId) {
  let materialsHtml = '<div style="margin: 15px 0;">';
  materialsHtml += '<h4>Selecione materiais utilizados:</h4>';
  
  if (budget.materials && budget.materials.length > 0) {
    budget.materials.forEach((m, idx) => {
      materialsHtml += `
        <div style="margin: 8px 0;">
          <label style="display: flex; align-items: center; gap: 10px;">
            <input type="checkbox" class="material-check" data-id="${m.material_id || m.id}" data-name="${m.item_name}" />
            <span>${m.item_name}</span>
            <input type="number" class="material-qty" min="0" step="0.1" placeholder="Qtd" style="width: 70px;" />
          </label>
        </div>
      `;
    });
  } else {
    materialsHtml += '<p>Nenhum material planejado neste orçamento.</p>';
  }
  materialsHtml += '</div>';
  
  const sessions_remaining = budget.sessions_count - (budget.sessions_completed || 0);
  
  const dlg = document.createElement('div');
  dlg.id = 'finishSessionDialog';
  dlg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 2000; background: white; border: 2px solid #333; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.3); min-width: 500px; max-height: 80vh; overflow-y: auto;';
  dlg.innerHTML = `
    <h3>Finalizar Sessão - Orçamento ${budget.code}</h3>
    ${materialsHtml}
    <div style="margin: 20px 0; padding-top: 20px; border-top: 1px solid #ddd;">
      <strong>Próximo passo:</strong>
      <div style="margin-top: 10px;">
        <label style="display: block; margin: 8px 0;">
          <input type="radio" name="nextAction" value="complete-project" /> 
          ✓ Encerrar projeto (todas as sessões finalizadas)
        </label>
        ${sessions_remaining > 0 ? `
          <label style="display: block; margin: 8px 0;">
            <input type="radio" name="nextAction" value="schedule-next" checked /> 
            📅 Agendar próxima sessão (${sessions_remaining} restantes)
          </label>
        ` : ''}
      </div>
    </div>
    <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
      <button onclick="closeFinishSessionDialog()">Cancelar</button>
      <button onclick="submitFinishSession('${appointmentId}', '${budgetId}')" style="background-color: green;">Confirmar</button>
    </div>
  `;
  
  document.body.appendChild(dlg);
}

// fecha diálogo de finalizar sessão
function closeFinishSessionDialog() {
  const dlg = document.getElementById('finishSessionDialog');
  if (dlg) dlg.remove();
}

// submete finalização de sessão
async function submitFinishSession(appointmentId, budgetId) {
  const dlg = document.getElementById('finishSessionDialog');
  
  // coleta materiais confirmados
  const materials = [];
  dlg.querySelectorAll('.material-check:checked').forEach(check => {
    const qty = check.parentElement.parentElement.querySelector('.material-qty').value;
    if (qty && parseFloat(qty) > 0) {
      materials.push({
        material_id: parseInt(check.dataset.id),
        quantity: parseFloat(qty)
      });
    }
  });
  
  // ação selecionada
  const nextAction = dlg.querySelector('input[name=nextAction]:checked')?.value;
  
  try {
    // 1. Completa sessão com material confirmado
    await apiRequest(`/api/appointments/${appointmentId}/complete-session`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materials })
    });
    
    closeFinishSessionDialog();
    
    // 2. Oferece opção para próxima ação
    if (nextAction === 'complete-project') {
      // marca orçamento como completo
      await apiRequest(`/api/appointments/${budgetId}/complete-budget`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      notify('Projeto encerrado com sucesso', 'success');
    } else if (nextAction === 'schedule-next') {
      // mostra formulário para agendar próxima sessão
      notify('Agende a proxima sessao selecionando o mesmo orcamento', 'info', 5200);
    }
    
    listAppointments(currentFilter);
  } catch (err) {
    console.error('Erro:', err);
    notify(formatUiError(err, 'Erro ao processar finalizacao'), 'error');
  }
}

// ouvintes de eventos para filtros e botões
document.getElementById('filter-today').onclick = () => { currentFilter = 'today'; listAppointments(currentFilter); };
document.getElementById('filter-week').onclick = () => { currentFilter = 'week'; listAppointments(currentFilter); };
document.getElementById('filter-all').onclick = () => { currentFilter = 'all'; listAppointments(currentFilter); };
document.getElementById('cancelEdit').onclick = () => clearForm();
document.getElementById('clearAgendaContext').onclick = () => clearAgendaContextFilter();

document.getElementById('agendaForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  
  if (!f.client_id.value || !f.date.value || !f.time.value || !f.service.value) {
    notify('Preencha os campos obrigatorios', 'warning');
    return;
  }
  
  const payload = {
    client_id: parseInt(f.client_id.value),
    budget_id: f.budget_id.value ? parseInt(f.budget_id.value) : null,
    date: f.date.value,
    time: f.time.value,
    duration_min: parseInt(f.duration_min.value) || 180,
    service: f.service.value,
    price: parseFloat(f.price.value) || 0,
    status: f.status.value,
    notes: f.notes.value
  };
  
  try {
    if (editingId) {
      await apiRequest('/api/appointments/' + editingId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      await apiRequest('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    notify(editingId ? 'Agendamento atualizado' : 'Agendamento criado', 'success');
    clearForm();
    listAppointments(currentFilter);
  } catch (err) {
    console.error('Erro ao salvar:', err);
    if (err.status === 409) {
      notify('Conflito: ja existe um agendamento no mesmo horario', 'warning', 5200);
      return;
    }
    notify(formatUiError(err, 'Erro ao salvar agendamento'), 'error');
  }
});

// Inicialização (IIFE assíncrono)
(async () => {
  captureUrlContext();
  renderContextBar();
  await loadClients();
  await loadBudgets();
  await loadServiceOrders();
  applyUrlContextToForm();
  bindAgendaAuthButton();
  bindTableActions();
  listAppointments(currentFilter);
})();