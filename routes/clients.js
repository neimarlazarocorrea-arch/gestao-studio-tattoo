const express = require('express'); // framework de rotas
const router = express.Router(); // cria roteador modular
const clientCtrl = require('../controllers/clientController'); // importa controller de clientes

// rotas para /api/clients
// GET lista todos os clientes
router.get('/', clientCtrl.listClients);
// POST cria novo cliente
router.post('/', clientCtrl.createClient);
// GET recupera cliente por id
router.get('/:id', clientCtrl.getClient);
// PUT atualiza cliente por id
router.put('/:id', clientCtrl.updateClient);
// remove cliente por id
router.delete('/:id', clientCtrl.deleteClient);

module.exports = router; // exporta roteador
