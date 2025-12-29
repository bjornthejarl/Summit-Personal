/**
 * Database Migration Script for Security & Compliance Upgrade
 * 
 * Run this once to:
 * 1. Add new compliance fields to users table
 * 2. Create audit_logs and account_deletion_requests tables
 * 3. Set all users to require email re-verification
 * 
 * Usage: Run via startup.js or manually with `node scripts/migrate-security.js`
 */

const postgres = require('postgres');

const MIGRATION_SQL = `
-- ============================================
-- SECURITY & COMPLIANCE MIGRATION
-- ============================================

-- Add new fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS dormant_notified_at TIMESTAMP;

-- Create audit action enum
DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'anonymize');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  user_email TEXT,
  table_name VARCHAR(100) NOT NULL,
  record_id INTEGER,
  action audit_action NOT NULL,
  old_values TEXT,
  new_values TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  company_id INTEGER REFERENCES companies(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for audit logs queries
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_table_name_idx ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);

-- Create account_deletion_requests table
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  reason TEXT,
  country VARCHAR(2),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  financial_records_until TIMESTAMP,
  processed_at TIMESTAMP,
  processed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for deletion requests
CREATE INDEX IF NOT EXISTS account_deletion_requests_user_id_idx ON account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS account_deletion_requests_status_idx ON account_deletion_requests(status);

-- Set all existing users to require email verification (security upgrade)
UPDATE users SET email_verified = FALSE WHERE email_verified IS NULL OR email_verified = TRUE;

-- Set last_activity_at for existing users who don't have it
UPDATE users SET last_activity_at = updated_at WHERE last_activity_at IS NULL;
`;

async function runSecurityMigration() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.log('❌ DATABASE_URL not set, cannot run security migration');
        return false;
    }

    console.log('🔐 Running security & compliance migration...');

    const sql = postgres(databaseUrl);

    try {
        await sql.unsafe(MIGRATION_SQL);
        console.log('✅ Security migration completed!');
        console.log('');
        console.log('📋 Next steps:');
        console.log('   1. All users must verify their email to sign in');
        console.log('   2. Generate ENCRYPTION_KEY: openssl rand -hex 32');
        console.log('   3. Add ENCRYPTION_KEY to your environment variables');
        console.log('');
        await sql.end();
        return true;
    } catch (error) {
        console.error('❌ Security migration failed:', error.message);
        try { await sql.end(); } catch (e) { }
        return false;
    }
}

// Run if called directly
if (require.main === module) {
    runSecurityMigration()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { runSecurityMigration };
