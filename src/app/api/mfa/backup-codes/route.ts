import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateBackupCodes, getBackupCodesCount } from '@/lib/mfa';

/**
 * Backup Codes Management Endpoint
 * 
 * GET - Get remaining backup codes count
 * POST - Regenerate backup codes (requires password or TOTP verification)
 */

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = parseInt(session.user.id);

        const [user] = await db
            .select({ backupCodes: users.backupCodes })
            .from(users)
            .where(eq(users.id, userId));

        const count = getBackupCodesCount(user?.backupCodes || null);

        return NextResponse.json({ count });
    } catch (error) {
        console.error('Backup codes count error:', error);
        return NextResponse.json(
            { error: 'Failed to get backup codes count' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = parseInt(session.user.id);

        // Generate new backup codes
        const { encryptedCodes, plainCodes } = generateBackupCodes();

        // Update in database
        await db
            .update(users)
            .set({
                backupCodes: encryptedCodes,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        return NextResponse.json({
            success: true,
            backupCodes: plainCodes,
            message: 'Backup codes regenerated successfully',
        });
    } catch (error) {
        console.error('Backup codes regeneration error:', error);
        return NextResponse.json(
            { error: 'Failed to regenerate backup codes' },
            { status: 500 }
        );
    }
}
