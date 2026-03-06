const { spawn } = require('child_process');
const path = require('path');

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const ROOT_DIR = path.resolve(__dirname, '..');

let startedServer = null;
let createdAppointmentId = null;
let createdBudgetId = null;
let createdServiceOrderId = null;
let createdBudgetAppointmentId = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function isServerUp() {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/`, {}, 1500);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForServer(maxAttempts = 30, intervalMs = 500) {
  for (let i = 0; i < maxAttempts; i += 1) {
    if (await isServerUp()) return true;
    await sleep(intervalMs);
  }
  return false;
}

async function ensureServer() {
  if (await isServerUp()) {
    console.log('Using existing server:', BASE_URL);
    return;
  }

  console.log('Starting server for smoke tests...');
  startedServer = spawn('node', ['server.js'], {
    cwd: ROOT_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  startedServer.stdout.on('data', (chunk) => {
    const msg = String(chunk).trim();
    if (msg) console.log(`[server] ${msg}`);
  });

  startedServer.stderr.on('data', (chunk) => {
    const msg = String(chunk).trim();
    if (msg) console.error(`[server:err] ${msg}`);
  });

  const ready = await waitForServer();
  if (!ready) {
    throw new Error('Server did not become ready in time.');
  }
}

async function shutdownServer() {
  if (!startedServer) return;

  await new Promise((resolve) => {
    startedServer.once('exit', () => resolve());
    startedServer.kill();
    setTimeout(() => resolve(), 1500);
  });
}

async function requestJson(pathname, options = {}) {
  const res = await fetchWithTimeout(`${BASE_URL}${pathname}`, options);
  const text = await res.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return { res, body, text };
}

function unwrapData(body) {
  if (body && typeof body === 'object' && body.ok === true && Object.prototype.hasOwnProperty.call(body, 'data')) {
    return body.data;
  }
  return body;
}

function printResult(item) {
  const icon = item.ok ? 'PASS' : 'FAIL';
  console.log(`${icon} | ${item.name} | status=${item.status}`);
  if (!item.ok && item.detail) {
    console.log(`  detail: ${item.detail}`);
  }
}

async function runSmokeTests() {
  const results = [];

  const push = (name, ok, status, detail = '') => {
    const item = { name, ok, status, detail };
    results.push(item);
    printResult(item);
  };

  const home = await requestJson('/');
  push(
    'GET / homepage',
    home.res.status === 200 && String(home.text).includes('menu-dashboard'),
    home.res.status,
    'Expected status 200 and menu markup'
  );

  const agenda = await requestJson('/agenda');
  push('GET /agenda page', agenda.res.status === 200, agenda.res.status, 'Expected agenda page to load');

  const summary = await requestJson('/api/summary');
  push(
    'GET /api/summary',
    summary.res.status === 200 && summary.body && summary.body.ok === true,
    summary.res.status,
    'Expected { ok: true }'
  );

  const exportSummaryCsv = await requestJson('/api/reports/export/summary');
  const exportSummaryContentType = exportSummaryCsv.res.headers.get('content-type') || '';
  const exportSummaryText = typeof exportSummaryCsv.text === 'string' ? exportSummaryCsv.text : '';
  push(
    'GET /api/reports/export/summary',
    exportSummaryCsv.res.status === 200
      && exportSummaryContentType.includes('text/csv')
      && exportSummaryText.includes('totalIncome')
      && exportSummaryText.includes('serviceOrderCycleAvgDays'),
    exportSummaryCsv.res.status,
    'Expected CSV export with summary headers'
  );

  const clientsResp = await requestJson('/api/clients');
  const clients = unwrapData(clientsResp.body);
  push(
    'GET /api/clients contract',
    clientsResp.res.status === 200 && clientsResp.body && clientsResp.body.ok === true && Array.isArray(clients),
    clientsResp.res.status,
    'Expected {ok:true,data:[...]}'
  );

  let clientId = clients[0] && clients[0].id;

  if (!clientId) {
    const createClient = await requestJson('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Smoke User ${Date.now()}`,
        email: `smoke${Date.now()}@local.test`,
        phone: '11999999999'
      })
    });

    const createdClient = unwrapData(createClient.body);
    clientId = createdClient && createdClient.id;
    push(
      'POST /api/clients (fallback)',
      createClient.res.status < 300 && createClient.body && createClient.body.ok === true && !!clientId,
      createClient.res.status,
      'Expected {ok:true,data:{id}}'
    );
  }

  const invalidAppointment = await requestJson('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2030-01-01' })
  });
  push(
    'POST /api/appointments invalid payload',
    invalidAppointment.res.status === 400 && invalidAppointment.body && invalidAppointment.body.ok === false,
    invalidAppointment.res.status,
    'Expected {ok:false,error} with 400'
  );

  const nextDay = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const createAppointment = await requestJson('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      date: nextDay,
      time: '10:00',
      service: 'Smoke Appointment',
      duration_min: 60,
      price: 50
    })
  });

  const createdAppointment = unwrapData(createAppointment.body);
  createdAppointmentId = createdAppointment && createdAppointment.id;
  push(
    'POST /api/appointments create',
    createAppointment.res.status === 200 && createAppointment.body && createAppointment.body.ok === true && !!createdAppointmentId,
    createAppointment.res.status,
    'Expected created appointment id'
  );

  if (createdAppointmentId) {
    const getAppointment = await requestJson(`/api/appointments/${createdAppointmentId}`);
    const getAppointmentData = unwrapData(getAppointment.body);
    push(
      'GET /api/appointments/:id contract',
      getAppointment.res.status === 200 && getAppointment.body && getAppointment.body.ok === true && getAppointmentData && getAppointmentData.id === createdAppointmentId,
      getAppointment.res.status,
      'Expected {ok:true,data:{id}}'
    );

    const updateAppointment = await requestJson(`/api/appointments/${createdAppointmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        date: nextDay,
        time: '11:00',
        service: 'Smoke Appointment Updated',
        duration_min: 60,
        price: 55,
        status: 'scheduled'
      })
    });
    push('PUT /api/appointments/:id', updateAppointment.res.status === 200 && updateAppointment.body && updateAppointment.body.ok === true, updateAppointment.res.status, 'Expected update ok');

    const completeAppointment = await requestJson(`/api/appointments/${createdAppointmentId}/complete`, {
      method: 'PUT'
    });
    push('PUT /api/appointments/:id/complete', completeAppointment.res.status === 200 && completeAppointment.body && completeAppointment.body.ok === true, completeAppointment.res.status, 'Expected complete ok');

    const deleteAppointment = await requestJson(`/api/appointments/${createdAppointmentId}`, {
      method: 'DELETE'
    });
    push('DELETE /api/appointments/:id', deleteAppointment.res.status === 200 && deleteAppointment.body && deleteAppointment.body.ok === true, deleteAppointment.res.status, 'Expected delete ok');

    createdAppointmentId = null;

    const getDeleted = await requestJson(`/api/appointments/${createdAppointment.id}`);
    push(
      'GET deleted appointment',
      getDeleted.res.status === 404 && getDeleted.body && getDeleted.body.ok === false,
      getDeleted.res.status,
      'Expected {ok:false,error} with 404 after delete'
    );
  }

  const nextSessionValidation = await requestJson('/api/appointments/999999/next-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  push(
    'POST /api/appointments/:id/next-session invalid payload',
    nextSessionValidation.res.status === 400 && nextSessionValidation.body && nextSessionValidation.body.ok === false,
    nextSessionValidation.res.status,
    'Expected {ok:false,error} with 400'
  );

  const completeBudgetNotFound = await requestJson('/api/appointments/999999/complete-budget', {
    method: 'PUT'
  });
  push(
    'PUT /api/appointments/:budgetId/complete-budget nonexistent',
    completeBudgetNotFound.res.status === 404 && completeBudgetNotFound.body && completeBudgetNotFound.body.ok === false,
    completeBudgetNotFound.res.status,
    'Expected {ok:false,error} with 404'
  );

  const createBudget = await requestJson('/api/budgets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      title: `Smoke Budget ${Date.now()}`,
      sessions_count: 2,
      total_value: 250
    })
  });
  const createdBudget = unwrapData(createBudget.body);
  createdBudgetId = createdBudget && createdBudget.id;
  push(
    'POST /api/budgets create',
    createBudget.res.status === 201 && createBudget.body && createBudget.body.ok === true && !!createdBudgetId,
    createBudget.res.status,
    'Expected budget creation with id'
  );

  if (createdBudgetId) {
    const createServiceOrder = await requestJson(`/api/service-orders/from-budget/${createdBudgetId}`, {
      method: 'POST'
    });
    const createdServiceOrder = unwrapData(createServiceOrder.body);
    createdServiceOrderId = createdServiceOrder && createdServiceOrder.id;
    push(
      'POST /api/service-orders/from-budget/:budgetId',
      createServiceOrder.res.status === 201 && createServiceOrder.body && createServiceOrder.body.ok === true && !!createdServiceOrderId,
      createServiceOrder.res.status,
      'Expected service order creation from budget'
    );

    if (createdServiceOrderId) {
      const invalidServiceOrderStatus = await requestJson(`/api/service-orders/${createdServiceOrderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      push(
        'PUT /api/service-orders/:id/status invalid transition',
        invalidServiceOrderStatus.res.status === 400 && invalidServiceOrderStatus.body && invalidServiceOrderStatus.body.ok === false,
        invalidServiceOrderStatus.res.status,
        'Expected invalid transition open -> completed to be rejected'
      );

      const updateServiceOrderStatus = await requestJson(`/api/service-orders/${createdServiceOrderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' })
      });
      const updatedServiceOrder = unwrapData(updateServiceOrderStatus.body);
      push(
        'PUT /api/service-orders/:id/status',
        updateServiceOrderStatus.res.status === 200 && updateServiceOrderStatus.body && updateServiceOrderStatus.body.ok === true && updatedServiceOrder && updatedServiceOrder.status === 'in_progress',
        updateServiceOrderStatus.res.status,
        'Expected status update to in_progress'
      );

      const closeBudgetBlocked = await requestJson(`/api/budgets/${createdBudgetId}/close`, {
        method: 'POST'
      });
      push(
        'POST /api/budgets/:id/close blocked by OS status',
        closeBudgetBlocked.res.status === 400 && closeBudgetBlocked.body && closeBudgetBlocked.body.ok === false,
        closeBudgetBlocked.res.status,
        'Expected close budget to fail while OS is not completed'
      );

      const createBudgetAppointment = await requestJson('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          budget_id: createdBudgetId,
          date: nextDay,
          time: '13:00',
          service: 'Smoke Budget Session',
          duration_min: 60,
          price: 80
        })
      });
      const budgetAppointment = unwrapData(createBudgetAppointment.body);
      createdBudgetAppointmentId = budgetAppointment && budgetAppointment.id;
      push(
        'POST /api/appointments with budget links OS',
        createBudgetAppointment.res.status === 200 && createBudgetAppointment.body && createBudgetAppointment.body.ok === true && budgetAppointment && budgetAppointment.service_order_id === createdServiceOrderId,
        createBudgetAppointment.res.status,
        'Expected created appointment to carry service_order_id from budget'
      );

      const completeServiceOrderStatus = await requestJson(`/api/service-orders/${createdServiceOrderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      const completedServiceOrder = unwrapData(completeServiceOrderStatus.body);
      push(
        'PUT /api/service-orders/:id/status completed',
        completeServiceOrderStatus.res.status === 200 && completeServiceOrderStatus.body && completeServiceOrderStatus.body.ok === true && completedServiceOrder && completedServiceOrder.status === 'completed',
        completeServiceOrderStatus.res.status,
        'Expected status update to completed'
      );
    }

    const closeBudget = await requestJson(`/api/budgets/${createdBudgetId}/close`, {
      method: 'POST'
    });
    const closePayload = unwrapData(closeBudget.body) || {};
    push(
      'POST /api/budgets/:id/close',
      closeBudget.res.status === 200 && closeBudget.body && closeBudget.body.ok === true && closePayload.service_order,
      closeBudget.res.status,
      'Expected budget close with linked service order'
    );

    const listServiceOrders = await requestJson('/api/service-orders');
    const soRows = unwrapData(listServiceOrders.body);
    push(
      'GET /api/service-orders',
      listServiceOrders.res.status === 200 && listServiceOrders.body && listServiceOrders.body.ok === true && Array.isArray(soRows),
      listServiceOrders.res.status,
      'Expected service order listing'
    );
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  console.log('\nSmoke summary:');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

async function cleanup() {
  if (createdAppointmentId) {
    try {
      await requestJson(`/api/appointments/${createdAppointmentId}`, { method: 'DELETE' });
    } catch {
      // Ignore cleanup failures.
    }
  }

  if (createdBudgetAppointmentId) {
    try {
      await requestJson(`/api/appointments/${createdBudgetAppointmentId}`, { method: 'DELETE' });
    } catch {
      // Ignore cleanup failures.
    }
  }

  if (createdBudgetId) {
    try {
      await requestJson(`/api/budgets/${createdBudgetId}`, { method: 'DELETE' });
    } catch {
      // Ignore cleanup failures.
    }
  }

  await shutdownServer();
}

(async () => {
  try {
    await ensureServer();
    await runSmokeTests();
  } catch (err) {
    console.error('Smoke test fatal error:', err.message || err);
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
})();
