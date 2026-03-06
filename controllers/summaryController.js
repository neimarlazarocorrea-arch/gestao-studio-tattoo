const summaryService = require('../services/summaryService'); // importa serviço de resumo

function getSummary(req, res) {
  summaryService.getSummary((err, summary) => {
    if (err) return res.status(500).json({ ok: false, error: err.message }); // erro ao gerar resumo
    res.json({ ok: true, data: summary }); // envia resumo como JSON
  });
}

module.exports = { getSummary }; // exporta função para rota
