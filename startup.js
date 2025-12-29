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

    console.log('🌐 Starting Next.js server...');
    require('./server.js');
}

start();
