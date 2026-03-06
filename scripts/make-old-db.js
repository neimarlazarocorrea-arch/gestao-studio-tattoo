// cria um banco de dados com o esquema antigo (sem coluna appointment_id)
const sqlite3 = require('sqlite3').verbose(); // driver sqlite
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '..', 'db', 'tattoo.db')); // abre arquivo

db.serialize(() => {
  // remove tabelas se existirem
  db.run('DROP TABLE IF EXISTS transactions');
  db.run('DROP TABLE IF EXISTS appointments');
  db.run('DROP TABLE IF EXISTS clients');

  // cria tabela de clientes mínima
  db.run('CREATE TABLE clients(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)');
  // cria tabela de agendamentos antiga
  db.run(`CREATE TABLE appointments(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    service TEXT NOT NULL,
    price REAL DEFAULT 0,
    status TEXT DEFAULT 'scheduled'
  )`);
  // cria tabela de transações sem vínculo com agendamento
  db.run(`CREATE TABLE transactions(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    category TEXT,
    description TEXT,
    amount REAL NOT NULL,
    date TEXT
  )`);

  console.log('Old schema created'); // feedback
  db.close(); // fecha conexão
});
