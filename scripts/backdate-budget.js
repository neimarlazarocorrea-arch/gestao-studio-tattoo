const db = require('../db/db');

db.run("UPDATE budgets SET created_at='2026-02-01 00:00:00' WHERE id=7", [], function(err) {
  if (err) {
    console.error('error', err);
  } else {
    console.log('updated', this.changes);
  }
  process.exit();
});
