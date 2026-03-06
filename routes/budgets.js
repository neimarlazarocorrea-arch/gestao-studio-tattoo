const express = require('express'); // import express
const router = express.Router(); // roteador de orçamentos
const ctrl = require('../controllers/budgetController'); // controller de orçamentos

router.get('/', ctrl.list); // lista todos os orçamentos
router.post('/', ctrl.create); // cria novo orçamento
router.get('/client/:clientId', ctrl.getByClient); // lista orçamentos por cliente
router.post('/:id/close', ctrl.close); // fecha orçamento e gera OS
router.get('/:id', ctrl.get); // obtém orçamento por id
router.put('/:id', ctrl.update); // atualiza orçamento
router.delete('/:id', ctrl.remove); // exclui orçamento

module.exports = router; // exporta roteador
