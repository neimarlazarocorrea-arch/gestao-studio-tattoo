const express = require('express'); // importa express
const router = express.Router(); // roteador de resumos
const ctrl = require('../controllers/summaryController'); // controller de resumo

router.get('/', ctrl.getSummary); // rota que retorna o resumo geral

module.exports = router; // exporta roteador