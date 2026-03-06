const sqlite3 = require('sqlite3').verbose(); // importa driver sqlite3 com modo verbose
const path = require('path'); // módulo de caminhos
const { dbFile } = require('./init'); // caminho para o arquivo do banco gerado em init

// abre o banco em modo serializado (uma query por vez)
const db = new sqlite3.Database(dbFile, err => {
  if (err) {
    console.error('Failed to open database', err); // log de erro de conexão
  } else {
    console.log('Connected to SQLite database.'); // sucesso na conexão
  }
});

module.exports = db; // exporta instância para uso pelos serviços
