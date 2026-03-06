const express = require('express'); // importa express
const router = express.Router(); // roteador de materiais
const ctrl = require('../controllers/materialController'); // controller de materiais

router.get('/', ctrl.list); // lista todos os materiais
router.get('/low-stock', ctrl.getLowStock); // lista materiais com estoque baixo
router.post('/', ctrl.create); // cria novo material
router.get('/:id', ctrl.get); // obtém material por id
router.put('/:id', ctrl.update); // atualiza material
router.delete('/:id', ctrl.remove); // exclui material

// operações de movimentação
router.post('/entry', ctrl.recordEntry); // registra entrada (compra)
router.post('/exit', ctrl.recordExit); // registra saída
router.post('/usage', ctrl.recordUsage); // registra uso em tatuagem

// históricos
router.get('/:id/movements', ctrl.getMovementHistory); // histórico de movimentações
router.get('/:id/usage-history', ctrl.getUsageHistory); // histórico de uso

module.exports = router; // exporta roteador
