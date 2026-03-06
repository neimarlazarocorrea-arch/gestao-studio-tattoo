// executa na inicialização para garantir que as tabelas existam e aplicar migrações leves

const fs = require('fs'); // sistema de arquivos
const path = require('path');
const sqlite3 = require('sqlite3').verbose(); // driver sqlite3 em modo verbose

const dbFile = path.join(__dirname, 'tattoo.db'); // caminho para arquivo do banco
const schemaFile = path.join(__dirname, 'schema.sql'); // arquivo com esquema inicial

// verifica se uma tabela possui determinada coluna
function hasColumn(db, table, column, callback) {
  db.all(`PRAGMA table_info(${table})`, (err, columns) => {
    if (err) return callback(err);

    const has =
      Array.isArray(columns) &&
      columns.some((c) => c.name === column);

    callback(null, has); // devolve resultado booleano
  });
}

// adiciona coluna se não existir, usando definição fornecida
function ensureColumn(db, table, column, definition, callback) {
  hasColumn(db, table, column, (err, has) => {
    if (err) return callback(err);
    if (has) return callback(null); // já existe

    const stmt = `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`;
    console.log('migrating:', stmt);

    db.run(stmt, (err2) => callback(err2 || null)); // executa alteração
  });
}

// cria índice se não existir
function ensureIndex(db, name, expression, callback) {
  db.run(
    `CREATE INDEX IF NOT EXISTS ${name} ON ${expression}`,
    (err) => {
      if (err) {
        console.error('failed to create index', name, err.message);
      }
      callback(err || null);
    }
  );
}

// função principal de inicialização
function init() {
  const db = new sqlite3.Database(dbFile); // abre/conecta ao arquivo
  const sql = fs.readFileSync(schemaFile, 'utf8'); // lê esquema SQL

  console.log('applying schema...');

  db.exec(sql, (err) => {
    if (err) {
      console.error('Failed to initialize database', err.message);
      console.error(err.stack);
      db.close();
      return; // aborta se falha
    }

    console.log('Database initialized.');

    // =========================
    // MIGRATIONS (sequenciais)
    // =========================

    // 1) adiciona coluna created_at em clients
    ensureColumn(
      db,
      'clients',
      'created_at',
      'DATETIME DEFAULT CURRENT_TIMESTAMP',
      (err1) => {
        if (err1) {
          console.error(
            'migration error for clients.created_at:',
            err1.message
          );
        }

        db.run(
          "UPDATE clients SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL",
          (e) =>
            e &&
            console.error(
              'failed to fill clients.created_at:',
              e.message
            )
        );

        // 2) adiciona coluna created_at em appointments
        ensureColumn(
          db,
          'appointments',
          'created_at',
          'DATETIME DEFAULT CURRENT_TIMESTAMP',
          (err2) => {
            if (err2) {
              console.error(
                'migration error for appointments.created_at:',
                err2.message
              );
            }

            db.run(
              "UPDATE appointments SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL",
              (e) =>
                e &&
                console.error(
                  'failed to fill appointments.created_at:',
                  e.message
                )
            );

            // 3) adiciona coluna duration_min em appointments
            ensureColumn(
              db,
              'appointments',
              'duration_min',
              'INTEGER DEFAULT 180',
              (err3) => {
                if (err3) {
                  console.error(
                    'migration error for appointments.duration_min:',
                    err3.message
                  );
                }

                db.run(
                  "UPDATE appointments SET duration_min = 180 WHERE duration_min IS NULL",
                  (e) =>
                    e &&
                    console.error(
                      'failed to fill appointments.duration_min:',
                      e.message
                    )
                );

                // 4) adiciona coluna updated_at em inventory
                ensureColumn(
                  db,
                  'inventory',
                  'updated_at',
                  'DATETIME DEFAULT CURRENT_TIMESTAMP',
                  (err4) => {
                    if (err4) {
                      console.error(
                        'migration error for inventory.updated_at:',
                        err4.message
                      );
                    }

                    // 5) adiciona coluna created_at em transactions
                    ensureColumn(
                      db,
                      'transactions',
                      'created_at',
                      'DATETIME DEFAULT CURRENT_TIMESTAMP',
                      (err5) => {
                        if (err5) {
                          console.error(
                            'migration error for transactions.created_at:',
                            err5.message
                          );
                        }

                        db.run(
                          "UPDATE transactions SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL",
                          () => {}
                        );

                        // 6) adiciona coluna appointment_id em transactions
                        ensureColumn(
                          db,
                          'transactions',
                          'appointment_id',
                          'INTEGER',
                          (err6) => {
                            if (err6) {
                              console.error(
                                'migration error for appointment_id:',
                                err6.message
                              );
                            }

                            // 6.5) adiciona coluna budget_id em transactions
                            ensureColumn(
                              db,
                              'transactions',
                              'budget_id',
                              'INTEGER',
                              (err6b) => {
                                if (err6b) {
                                  console.error(
                                    'migration error for transactions.budget_id:',
                                    err6b.message
                                  );
                                }

                                // cria índices
                                ensureIndex(
                                  db,
                                  'idx_transactions_budget',
                                  'transactions(budget_id)',
                                  () => {
                                    ensureIndex(
                                      db,
                                      'idx_transactions_appointment',
                                      'transactions(appointment_id)',
                                      () => {
                                        // 8) adiciona coluna material_id em budget_materials
                                        ensureColumn(
                                          db,
                                          'budget_materials',
                                          'material_id',
                                          'INTEGER',
                                          (err7) => {
                                            if (err7) {
                                              console.error(
                                                'migration error for budget_materials.material_id:',
                                                err7.message
                                              );
                                            }

                                            // 9) adiciona coluna code em budgets
                                            ensureColumn(
                                              db,
                                              'budgets',
                                              'code',
                                              'TEXT',
                                              (err8) => {
                                                if (err8) {
                                                  console.error(
                                                    'migration error for budgets.code:',
                                                    err8.message
                                                  );
                                                }

                                                // 9.5) adiciona coluna amount_paid em budgets
                                                ensureColumn(
                                                  db,
                                                  'budgets',
                                                  'amount_paid',
                                                  'REAL DEFAULT 0',
                                                  (err8b) => {
                                                    if (err8b) {
                                                      console.error(
                                                        'migration error for budgets.amount_paid:',
                                                        err8b.message
                                                      );
                                                    }
                                                    // continue with sessions_completed
                                                    ensureColumn(
                                                      db,
                                                      'budgets',
                                                      'sessions_completed',
                                                      'INTEGER DEFAULT 0',
                                                      (err9) => {
                                                        if (err9) {
                                                          console.error(
                                                            'migration error for budgets.sessions_completed:',
                                                            err9.message
                                                          );
                                                        }

                                                        // 12) adiciona coluna session_number em appointments
                                                        ensureColumn(
                                                          db,
                                                          'appointments',
                                                          'session_number',
                                                          'INTEGER DEFAULT 1',
                                                          (err11) => {
                                                            if (err11) {
                                                              console.error(
                                                                'migration error for appointments.session_number:',
                                                                err11.message
                                                              );
                                                            }

                                                            // 13) adiciona coluna is_completed em appointments
                                                            ensureColumn(
                                                              db,
                                                              'appointments',
                                                              'is_completed',
                                                              'INTEGER DEFAULT 0',
                                                              (err12) => {
                                                                if (err12) {
                                                                  console.error(
                                                                    'migration error for appointments.is_completed:',
                                                                    err12.message
                                                                  );
                                                                }

                                                                // 14) adiciona coluna service_order_id em appointments
                                                                ensureColumn(
                                                                  db,
                                                                  'appointments',
                                                                  'service_order_id',
                                                                  'INTEGER',
                                                                  (err13) => {
                                                                    if (err13) {
                                                                      console.error(
                                                                        'migration error for appointments.service_order_id:',
                                                                        err13.message
                                                                      );
                                                                    }

                                                                    ensureIndex(
                                                                      db,
                                                                      'idx_appointments_service_order',
                                                                      'appointments(service_order_id)',
                                                                      () => db.close()
                                                                    );
                                                                  }
                                                                );
                                                              }
                                                            );
                                                          }
                                                        );
                                                      }
                                                    );
                                                  }
                                                );
                                              }
                                            );
                                          }
                                        );
                                      }
                                    );
                                  }
                                );
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
}

module.exports = {
  init,
  dbFile
};