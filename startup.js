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

    // Run items migration (idempotent - safe to run multiple times)
    const { runItemsMigration } = require('./scripts/migrate-items.js');
    try {
        await runItemsMigration();
    } catch (error) {
        console.error('⚠️ Items migration warning:', error.message);
        // Continue anyway - migration might already be done
    }

    // TEMPORARY: Clear all clients from database (REMOVE THIS AFTER FIRST DEPLOYMENT!)
    const postgres = require('postgres');
    try {
        const databaseUrl = process.env.DATABASE_URL;
        if (databaseUrl) {
            console.log('🗑️  TEMPORARY: Clearing all clients from database...');
            const sql = postgres(databaseUrl);
            const result = await sql`DELETE FROM clients`;
            console.log(`✅ Clients cleared! Rows deleted: ${result.count}`);
            await sql.end();
        }
    } catch (error) {
        console.error('⚠️ Clear clients warning:', error.message);
    }

    console.log('🌐 Starting Next.js server...');
    require('./server.js');
}

start();
