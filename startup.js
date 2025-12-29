// Startup script that checks for database tables and creates them if needed
const postgres = require('postgres');

const MIGRATION_SQL = `
-- Create enums if they don't exist
DO $$ BEGIN
  CREATE TYPE role AS ENUM ('admin', 'staff', 'accountant');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('bank', 'credit_card', 'cash');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('debit', 'credit');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('card', 'bank_transfer', 'cash', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  default_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  logo_url TEXT,
  bank_account TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  tax_number TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  soft_delete BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL,
  password TEXT,
  role role NOT NULL DEFAULT 'staff',
  company_id INTEGER REFERENCES companies(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  soft_delete BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX IF NOT EXISTS email_idx ON users(email);

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  payment_terms INTEGER DEFAULT 30,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  soft_delete BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX IF NOT EXISTS clients_company_id_idx ON clients(company_id, email);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  client_id INTEGER NOT NULL REFERENCES clients(id),
  invoice_number TEXT NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT '0',
  tax_rate DECIMAL(5, 2) DEFAULT '0',
  total DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  xendit_invoice_id VARCHAR(255),
  xendit_invoice_url VARCHAR(2048),
  recurring VARCHAR(20) NOT NULL DEFAULT 'none',
  next_due_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMP,
  soft_delete BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id),
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotes (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  client_id INTEGER NOT NULL REFERENCES clients(id),
  quote_number TEXT NOT NULL,
  status quote_status NOT NULL DEFAULT 'draft',
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT '0',
  tax_rate DECIMAL(5, 2) DEFAULT '0',
  total DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMP,
  soft_delete BOOLEAN NOT NULL DEFAULT FALSE,
  converted_to_invoice_id INTEGER REFERENCES invoices(id)
);

CREATE TABLE IF NOT EXISTS quote_items (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER NOT NULL REFERENCES quotes(id),
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  soft_delete BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  website VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  soft_delete BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  category_id INTEGER REFERENCES expense_categories(id),
  vendor_id INTEGER REFERENCES vendors(id),
  vendor VARCHAR(255),
  description TEXT,
  amount VARCHAR(20) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  expense_date DATE NOT NULL,
  receipt_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  recurring VARCHAR(20) NOT NULL DEFAULT 'none',
  next_due_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  soft_delete BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS income_categories (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  soft_delete BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS income (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  category_id INTEGER REFERENCES income_categories(id),
  client_id INTEGER REFERENCES clients(id),
  invoice_id INTEGER REFERENCES invoices(id),
  source VARCHAR(255),
  description TEXT,
  amount VARCHAR(20) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  income_date DATE NOT NULL,
  recurring VARCHAR(20) NOT NULL DEFAULT 'none',
  next_due_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  soft_delete BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS api_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  token_prefix VARCHAR(12) NOT NULL UNIQUE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS client_users (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  email TEXT NOT NULL,
  name TEXT,
  password TEXT,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  token_version INTEGER NOT NULL DEFAULT 0,
  soft_delete BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX IF NOT EXISTS client_users_email_idx ON client_users(email);
CREATE UNIQUE INDEX IF NOT EXISTS client_users_client_id_idx ON client_users(client_id, email);

CREATE TABLE IF NOT EXISTS client_login_tokens (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  used_at TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS client_login_tokens_token_idx ON client_login_tokens(token);

CREATE TABLE IF NOT EXISTS company_invitations (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  email TEXT NOT NULL,
  name TEXT,
  role role NOT NULL DEFAULT 'staff',
  token TEXT NOT NULL,
  status invitation_status NOT NULL DEFAULT 'pending',
  expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  used_at TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS company_invitations_token_idx ON company_invitations(token);
CREATE UNIQUE INDEX IF NOT EXISTS company_invitations_email_company_idx ON company_invitations(email, company_id);

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  type account_type NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  account_number VARCHAR(255),
  initial_balance DECIMAL(10, 2) NOT NULL DEFAULT '0',
  current_balance DECIMAL(10, 2) NOT NULL DEFAULT '0',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  soft_delete BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  type transaction_type NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  transaction_date DATE NOT NULL,
  category_id INTEGER,
  related_invoice_id INTEGER REFERENCES invoices(id),
  related_expense_id INTEGER REFERENCES expenses(id),
  related_income_id INTEGER REFERENCES income(id),
  reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  soft_delete BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  invoice_id INTEGER NOT NULL REFERENCES invoices(id),
  client_id INTEGER NOT NULL REFERENCES clients(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  payment_date DATE NOT NULL,
  payment_method payment_method NOT NULL,
  transaction_id INTEGER REFERENCES transactions(id),
  payment_processor_reference VARCHAR(255),
  status payment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  soft_delete BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS test (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

async function runMigrations() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.log('⚠️ DATABASE_URL not set, skipping migrations');
        return;
    }

    console.log('🔍 Checking database tables...');

    const sql = postgres(databaseUrl);

    try {
        // Check if users table exists
        const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `;

        if (result[0].exists) {
            console.log('✅ Database tables already exist');
            await sql.end();
            return;
        }

        console.log('📦 Creating database tables...');
        await sql.unsafe(MIGRATION_SQL);
        console.log('✅ Database migration completed!');
        await sql.end();
    } catch (error) {
        console.error('⚠️ Migration warning:', error.message);
        try { await sql.end(); } catch (e) { }
    }
}

async function start() {
    console.log('🚀 Starting vAlpha...');

    await runMigrations();

    console.log('🌐 Starting Next.js server...');
    require('./server.js');
}

start();
