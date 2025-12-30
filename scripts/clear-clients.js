/**
 * TEMPORARY SCRIPT: Clear all clients from the database
 * 
 * Run with: node scripts/clear-clients.js
 * 
 * ⚠️ DELETE THIS FILE AFTER USE ⚠️
 */

const postgres = require('postgres');

async function clearClients() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.log('❌ DATABASE_URL not set');
        return false;
    }

    console.log('🗑️  Clearing all clients from database...');

    const sql = postgres(databaseUrl);

    try {
        // Delete all clients
        const result = await sql`DELETE FROM clients`;
        console.log('✅ All clients deleted!');
        console.log(`   Rows deleted: ${result.count}`);
        await sql.end();
        return true;
    } catch (error) {
        console.error('❌ Error clearing clients:', error.message);
        try { await sql.end(); } catch (e) { }
        return false;
    }
}

// Run if called directly
clearClients()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
