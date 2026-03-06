const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DB_FILE = path.join(ROOT, 'db', 'tattoo.db');

const source = process.argv[2];
if (!source) {
  console.error('Uso: node scripts/restore-db.js <caminho-do-backup.db>');
  process.exit(1);
}

const sourcePath = path.isAbsolute(source) ? source : path.join(ROOT, source);
if (!fs.existsSync(sourcePath)) {
  console.error('Arquivo de backup nao encontrado:', sourcePath);
  process.exit(1);
}

fs.copyFileSync(sourcePath, DB_FILE);
console.log('Banco restaurado a partir de:', sourcePath);
