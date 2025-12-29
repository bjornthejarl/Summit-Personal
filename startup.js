// Startup script - runs migrations then starts Next.js server
const { runSecurityMigration } = require('./scripts/migrate-security.js');
const { runMFAMigration } = require('./scripts/migrate-mfa.js');

async function start() {
    console.log('🚀 Starting vAlpha...');

    // Run security migration (idempotent - safe to run multiple times)
    try {
        await runSecurityMigration();
    } catch (error) {
        console.error('⚠️ Security migration warning:', error.message);
        // Continue anyway - migration might already be done
    }

    // Run MFA migration (idempotent - safe to run multiple times)
    try {
        await runMFAMigration();
    } catch (error) {
        console.error('⚠️ MFA migration warning:', error.message);
        // Continue anyway - migration might already be done
    }

    // TEMPORARY: Reset MFA for all users (remove after deployment)
    try {
        console.log('🔓 Resetting MFA for all users...');
        const postgres = require('postgres');
        const sql = postgres(process.env.DATABASE_URL, { max: 1 });
        const result = await sql`
            UPDATE users 
            SET mfa_enabled = FALSE, mfa_secret = NULL, backup_codes = NULL, mfa_enrolled_at = NULL
            WHERE mfa_enabled = TRUE
            RETURNING email
        `;
        console.log(`✅ MFA reset for ${result.length} users`);
        result.forEach(u => console.log(`   - ${u.email}`));
        await sql.end();
    } catch (error) {
        console.error('⚠️ MFA reset warning:', error.message);
        // Continue anyway
    }

    console.log('🌐 Starting Next.js server...');
    require('./server.js');
}

start();
