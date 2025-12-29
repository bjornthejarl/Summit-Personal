// Startup script that runs migrations before starting the app
const { execSync } = require('child_process');

console.log('🚀 Starting vAlpha...');

// Run database migrations
try {
    console.log('🔍 Checking database and running migrations if needed...');
    execSync('npx drizzle-kit push --force', {
        stdio: 'inherit',
        env: process.env
    });
    console.log('✅ Database ready!');
} catch (error) {
    console.error('⚠️ Migration warning:', error.message);
    // Continue anyway - migrations might already be applied
}

// Start the Next.js server
console.log('🌐 Starting Next.js server...');
require('./server.js');
