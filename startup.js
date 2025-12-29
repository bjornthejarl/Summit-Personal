// Startup script - runs security migration then starts Next.js server
const { runSecurityMigration } = require('./scripts/migrate-security.js');

async function start() {
    console.log('🚀 Starting vAlpha...');

    // Run security migration (idempotent - safe to run multiple times)
    try {
        await runSecurityMigration();
    } catch (error) {
        console.error('⚠️ Migration warning:', error.message);
        // Continue anyway - migration might already be done
    }

    console.log('🌐 Starting Next.js server...');
    require('./server.js');
}

start();
