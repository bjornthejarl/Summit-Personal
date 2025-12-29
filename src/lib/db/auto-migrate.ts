import { db } from './index';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

/**
 * Auto-migrate database on startup
 * Checks if tables exist, creates them if not
 */
export async function autoMigrate() {
    try {
        console.log('🔍 Checking database tables...');

        // Check if the 'users' table exists (core table)
        const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

        const tablesExist = result[0]?.exists === true;

        if (tablesExist) {
            console.log('✅ Database tables already exist, skipping migration');
            return;
        }

        console.log('📦 Tables not found, running migrations...');

        // Run migrations
        await migrate(db, { migrationsFolder: './src/lib/db/migrations' });

        console.log('✅ Database migrations completed successfully!');
    } catch (error) {
        console.error('❌ Auto-migration error:', error);
        // Don't throw - let the app start anyway
    }
}
