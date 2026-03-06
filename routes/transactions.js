const express = require('express'); // importa express
const router = express.Router(); // roteador de transações
const ctrl = require('../controllers/transactionController'); // controller de transações

router.get('/', ctrl.list); // lista todas transações
router.post('/', ctrl.create); // cria nova transação
router.get('/:id', ctrl.get); // obtém transação por id
router.put('/:id', ctrl.update); // atualiza transação
router.delete('/:id', ctrl.remove); // exclui transação

module.exports = router; // exporta roteador