// Reset MFA for all users
require('dotenv').config();
const postgres = require('postgres');

async function resetMFA() {
    console.log('🔄 Resetting MFA for all users...');

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is not set');
    }

    const sql = postgres(connectionString, { max: 1 });

    try {
        // Reset all MFA fields for all users
        const result = await sql`
            UPDATE users 
            SET 
                mfa_enabled = FALSE,
                mfa_secret = NULL,
                backup_codes = NULL,
                mfa_enrolled_at = NULL,
                updated_at = NOW()
            WHERE mfa_enabled = TRUE OR mfa_secret IS NOT NULL
            RETURNING email
        `;

        console.log(`✅ MFA reset for ${result.length} users:`);
        result.forEach(user => console.log(`   - ${user.email}`));
        console.log('✅ All users can now log in without MFA');
        console.log('ℹ️  They will be prompted to set up MFA again on next admin login');

        await sql.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error resetting MFA:', error);
        await sql.end();
        process.exit(1);
    }
}

resetMFA();
