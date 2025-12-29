import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyTOTP, verifyAndConsumeBackupCode } from '@/lib/mfa';

/**
 * MFA Verification Endpoint
 * 
 * POST - Verify MFA code (TOTP or backup code) during login
 */

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, token, isBackupCode } = body;

        if (!userId || !token) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Get user's MFA data
        const [user] = await db
            .select({
                id: users.id,
                mfaEnabled: users.mfaEnabled,
                mfaSecret: users.mfaSecret,
                backupCodes: users.backupCodes,
            })
            .from(users)
            .where(eq(users.id, parseInt(userId)));

        if (!user || !user.mfaEnabled) {
            return NextResponse.json(
                { error: 'MFA not enabled for this user' },
                { status: 400 }
            );
        }

        let isValid = false;

        if (isBackupCode) {
            // Verify and consume backup code
            if (!user.backupCodes) {
                return NextResponse.json(
                    { error: 'No backup codes available' },
                    { status: 400 }
                );
            }

            const result = verifyAndConsumeBackupCode(user.backupCodes, token);
            isValid = result.valid;

            if (result.valid) {
                // Update remaining backup codes
                await db
                    .update(users)
                    .set({
                        backupCodes: result.remainingEncryptedCodes,
                        updatedAt: new Date(),
                    })
                    .where(eq(users.id, user.id));

                return NextResponse.json({
                    success: true,
                    message: 'Backup code verified',
                    remainingBackupCodes: result.remainingCount,
                    warning: result.remainingCount === 0
                        ? 'This was your last backup code. Please generate new ones.'
                        : result.remainingCount <= 3
                            ? `Only ${result.remainingCount} backup codes remaining.`
                            : undefined,
                });
            }
        } else {
            // Verify TOTP code
            if (!user.mfaSecret) {
                return NextResponse.json(
                    { error: 'MFA secret not found' },
                    { status: 400 }
                );
            }

            isValid = verifyTOTP(user.mfaSecret, token);
        }

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid verification code' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'MFA verified successfully',
        });
    } catch (error) {
        console.error('MFA verification error:', error);
        return NextResponse.json(
            { error: 'Failed to verify MFA code' },
            { status: 500 }
        );
    }
}
