const express = require('express'); // import express
const router = express.Router(); // roteador para agendamentos
const ctrl = require('../controllers/appointmentController'); // controller de agendamentos

// rotas específicas nomeadas (antes das rutas com parâmetros)
router.get('/upcoming', ctrl.upcoming); // próximos agendamentos
router.get('/today-count', ctrl.todayCount); // quantidade de hoje

// rotas CRUD básicas
router.get('/', ctrl.list); // lista agendamentos
router.post('/', ctrl.create); // cria agendamento
router.get('/:id', ctrl.get); // consulta por id
router.put('/:id/complete', ctrl.complete); // marca como completo
router.put('/:id/complete-session', ctrl.completeSession); // conclui sessão com material
router.post('/:id/next-session', ctrl.createNextSession); // cria próxima sessão
router.put('/:budgetId/complete-budget', ctrl.completeBudget); // conclui orçamento
router.put('/:id', ctrl.update); // atualiza agendamento
router.delete('/:id', ctrl.remove); // exclui agendamento

module.exports = router; // exporta roteador