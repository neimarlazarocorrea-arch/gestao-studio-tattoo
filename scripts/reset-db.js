// script simples para remover arquivo de banco existente e recriar o esquema

const fs = require('fs'); // sistema de arquivos
const path = require('path');
const { init, dbFile } = require('../db/init'); // funções de inicialização

console.log('Resetting database...');

if (fs.existsSync(dbFile)) {
  try {
    fs.unlinkSync(dbFile); // remove arquivo do banco
    console.log('Deleted existing database file.');
  } catch (e) {
    console.error('Unable to delete database file. Is the server running? Stop it before resetting.');
    process.exit(1); // sai com erro se não puder apagar
  }
} else {
  console.log('No existing database file found.');
}

// após remoção, chama init para recriar tudo
init();

console.log('Database reset complete.');
