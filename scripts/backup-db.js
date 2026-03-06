const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DB_FILE = path.join(ROOT, 'db', 'tattoo.db');
const BACKUP_DIR = path.join(ROOT, 'backups');

function timestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

if (!fs.existsSync(DB_FILE)) {
  console.error('Banco nao encontrado em:', DB_FILE);
  process.exit(1);
}

fs.mkdirSync(BACKUP_DIR, { recursive: true });
const target = path.join(BACKUP_DIR, `tattoo-${timestamp()}.db`);
fs.copyFileSync(DB_FILE, target);
console.log('Backup criado em:', target);
