const express = require('express'); // import express
const router = express.Router(); // roteador de inventário
const ctrl = require('../controllers/inventoryController'); // controller de inventário

router.get('/', ctrl.list); // lista todos os itens
router.post('/', ctrl.create); // adiciona item
router.get('/:id', ctrl.get); // obtém item por id
router.put('/:id', ctrl.update); // atualiza item
router.delete('/:id', ctrl.remove); // exclui item

module.exports = router; // exporta roteador