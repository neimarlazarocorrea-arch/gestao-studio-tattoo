-- tabela de clientes
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP -- data de criação automática
);

-- tabela de agendamentos
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL, -- referência para cliente
  budget_id INTEGER, -- referência para orçamento
  service_order_id INTEGER, -- referência para ordem de serviço
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  duration_min INTEGER DEFAULT 180, -- duração em minutos
  service TEXT NOT NULL,
  price REAL DEFAULT 0,
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled
  session_number INTEGER DEFAULT 1, -- número da sessão dentro do orçamento
  is_completed INTEGER DEFAULT 0, -- 0=não concluído, 1=concluído e material confirmado
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(client_id) REFERENCES clients(id),
  FOREIGN KEY(budget_id) REFERENCES budgets(id),
  FOREIGN KEY(service_order_id) REFERENCES service_orders(id)
);

-- índices para consultas mais rápidas
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);

-- tabela de materiais de estoque
CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT,
  current_qty REAL DEFAULT 0,
  min_qty REAL DEFAULT 0,
  unit_cost REAL DEFAULT 0,
  unit TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- tabela legada de inventário (compatibilidade)
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item TEXT NOT NULL,
  brand TEXT,
  qty INTEGER DEFAULT 0,
  min_qty INTEGER DEFAULT 0,
  unit_cost REAL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- tabela de uso de materiais em tatuagens
CREATE TABLE IF NOT EXISTS material_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id INTEGER NOT NULL,
  appointment_id INTEGER NOT NULL,
  quantity_used REAL NOT NULL,
  notes TEXT,
  used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(material_id) REFERENCES materials(id),
  FOREIGN KEY(appointment_id) REFERENCES appointments(id)
);

-- tabela de histórico de movimentação de estoque
CREATE TABLE IF NOT EXISTS material_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id INTEGER NOT NULL,
  movement_type TEXT CHECK(movement_type IN ('entrada','saída','ajuste')) NOT NULL,
  quantity REAL NOT NULL,
  reason TEXT,
  notes TEXT,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(material_id) REFERENCES materials(id)
);

CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);
CREATE INDEX IF NOT EXISTS idx_material_usage_appointment ON material_usage(appointment_id);
CREATE INDEX IF NOT EXISTS idx_material_usage_material ON material_usage(material_id);
CREATE INDEX IF NOT EXISTS idx_material_movements_material ON material_movements(material_id);

-- tabela de transações financeiras
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT CHECK(type IN ('in','out')) NOT NULL, -- entrada/saída
  category TEXT,
  description TEXT,
  amount REAL NOT NULL,
  date TEXT,
  appointment_id INTEGER, -- vínculo opcional com agendamento
  budget_id INTEGER, -- vínculo opcional com orçamento
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(appointment_id) REFERENCES appointments(id),
  FOREIGN KEY(budget_id) REFERENCES budgets(id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_appointment ON transactions(appointment_id);

-- tabela de orçamentos
CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  code TEXT, -- código único do orçamento (ex: ORC-20260303-001)
  estimated_time_min INTEGER DEFAULT 180,
  sessions_count INTEGER DEFAULT 1,
  sessions_completed INTEGER DEFAULT 0, -- quantas sessões foram finalizadas
  total_value REAL DEFAULT 0,
  amount_paid REAL DEFAULT 0, -- quantia já recebida
  status TEXT DEFAULT 'active', -- active, completed, cancelled
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(client_id) REFERENCES clients(id)
);

-- tabela de materiais do orçamento
CREATE TABLE IF NOT EXISTS budget_materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  quantity REAL DEFAULT 1,
  unit_cost REAL DEFAULT 0,
  material_id INTEGER,
  FOREIGN KEY(budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
  FOREIGN KEY(material_id) REFERENCES materials(id)
);

CREATE INDEX IF NOT EXISTS idx_budgets_client ON budgets(client_id);
CREATE INDEX IF NOT EXISTS idx_budget_materials_budget ON budget_materials(budget_id);
-- tabela de recibos de pagamento
CREATE TABLE IF NOT EXISTS receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT DEFAULT 'income', -- income, expense
  reference_type TEXT, -- 'budget', 'transaction', 'appointment'
  reference_id INTEGER,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_receipts_reference ON receipts(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date);
-- tabela de lembretes de cobrança
CREATE TABLE IF NOT EXISTS collection_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  reminder_type TEXT DEFAULT 'email',
  scheduled_date TEXT NOT NULL,
  sent_date TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  days_overdue INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(budget_id) REFERENCES budgets(id),
  FOREIGN KEY(client_id) REFERENCES clients(id)
);

CREATE INDEX IF NOT EXISTS idx_collection_reminders_status ON collection_reminders(status);
CREATE INDEX IF NOT EXISTS idx_collection_reminders_scheduled ON collection_reminders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_collection_reminders_budget ON collection_reminders(budget_id);

-- tabela de ordens de serviço (gerada quando orçamento é fechado)
CREATE TABLE IF NOT EXISTS service_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_id INTEGER NOT NULL UNIQUE,
  client_id INTEGER NOT NULL,
  code TEXT UNIQUE,
  title TEXT,
  total_value REAL DEFAULT 0,
  sessions_count INTEGER DEFAULT 1,
  sessions_completed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open', -- open, in_progress, completed, cancelled
  accepted_at TEXT,
  completed_at TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(budget_id) REFERENCES budgets(id),
  FOREIGN KEY(client_id) REFERENCES clients(id)
);

CREATE INDEX IF NOT EXISTS idx_service_orders_budget ON service_orders(budget_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_client ON service_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);

-- trilha de auditoria para ações críticas
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  actor TEXT,
  actor_role TEXT,
  route TEXT,
  method TEXT,
  ip TEXT,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
