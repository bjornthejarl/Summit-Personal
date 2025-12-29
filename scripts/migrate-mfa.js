/**
 * Database Migration: PII Encryption + MFA
 * 
 * Run this to:
 * 1. Add MFA fields to users table
 * 2. Add hash fields for searchable encrypted PII
 * 3. Add hash fields to clients table
 */

const postgres = require('postgres');

const MIGRATION_SQL = `
-- ============================================
-- PII ENCRYPTION + MFA MIGRATION
-- ============================================

-- Add MFA fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enrolled_at TIMESTAMP;

-- Add searchable hash fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_hash TEXT;

-- Add searchable hash fields to clients table  
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email_hash TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone_hash TEXT;

-- Create indices for hash lookups
CREATE INDEX IF NOT EXISTS users_email_hash_idx ON users(email_hash);
CREATE INDEX IF NOT EXISTS users_phone_hash_idx ON users(phone_hash);
CREATE INDEX IF NOT EXISTS clients_email_hash_idx ON clients(email_hash);
CREATE INDEX IF NOT EXISTS clients_phone_hash_idx ON clients(phone_hash);

-- Note: PII encryption will be applied at application layer
-- No data migration needed for encryption - will happen on next update
`;

async function runMFAMigration() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.log('❌ DATABASE_URL not set, cannot run MFA migration');
        return false;
    }

    console.log('🔐 Running PII Encryption + MFA migration...');

    const sql = postgres(databaseUrl);

    try {
        await sql.unsafe(MIGRATION_SQL);
        console.log('✅ MFA migration completed!');
        console.log('');
        console.log('📋 Next steps:');
        console.log('   1. Install dependencies: pnpm install');
        console.log('   2. Set MFA_ISSUER in environment (e.g., "vAlpha")');
        console.log('   3. Restart the application');
        console.log('   4. Admins can enroll in MFA via /settings/security');
        console.log('');
        await sql.end();
        return true;
    } catch (error) {
        console.error('❌ MFA migration failed:', error.message);
        try { await sql.end(); } catch (e) { }
        return false;
    }
}

// Run if called directly
if (require.main === module) {
    runMFAMigration()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { runMFAMigration };
