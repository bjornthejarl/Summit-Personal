/**
 * Database Migration: Items/Products Catalog
 * 
 * Run this to:
 * 1. Create items table for reusable products/services
 * 2. Add optional item_id reference to quote_items and invoice_items
 */

const postgres = require('postgres');

const MIGRATION_SQL = `
-- ============================================
-- ITEMS CATALOG MIGRATION
-- ============================================

-- Create items table for reusable products/services catalog
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  default_unit_price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100),
  sku VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  soft_delete BOOLEAN DEFAULT FALSE NOT NULL
);

-- Add optional item_id reference to invoice_items (for tracking catalog item used)
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS item_id INTEGER REFERENCES items(id);

-- Add optional item_id reference to quote_items (for tracking catalog item used)
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS item_id INTEGER REFERENCES items(id);

-- Create indices for better query performance
CREATE INDEX IF NOT EXISTS items_company_id_idx ON items(company_id);
CREATE INDEX IF NOT EXISTS items_category_idx ON items(category);
CREATE INDEX IF NOT EXISTS items_sku_idx ON items(sku);
CREATE INDEX IF NOT EXISTS items_is_active_idx ON items(is_active);
CREATE INDEX IF NOT EXISTS invoice_items_item_id_idx ON invoice_items(item_id);
CREATE INDEX IF NOT EXISTS quote_items_item_id_idx ON quote_items(item_id);
`;

async function runItemsMigration() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.log('❌ DATABASE_URL not set, cannot run items migration');
        return false;
    }

    console.log('📦 Running Items Catalog migration...');

    const sql = postgres(databaseUrl);

    try {
        await sql.unsafe(MIGRATION_SQL);
        console.log('✅ Items migration completed!');
        await sql.end();
        return true;
    } catch (error) {
        console.error('❌ Items migration failed:', error.message);
        try { await sql.end(); } catch (e) { }
        return false;
    }
}

// Run if called directly
if (require.main === module) {
    runItemsMigration()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { runItemsMigration };
