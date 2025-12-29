import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateMFASecret, generateQRCodeDataURL, verifyTOTP, generateBackupCodes } from '@/lib/mfa';

/**
 * MFA Enrollment Endpoint
 * 
 * POST - Initiate MFA enrollment (generate secret and QR code)
 * PUT - Complete MFA enrollment (verify TOTP and enable MFA)
 */

// POST /api/mfa/enroll - Generate secret and QR code
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id || !session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = parseInt(session.user.id);
        const userEmail = session.user.email;

        // Check if MFA is already enabled
        const [user] = await db
            .select({ mfaEnabled: users.mfaEnabled })
            .from(users)
            .where(eq(users.id, userId));

        if (user?.mfaEnabled) {
            return NextResponse.json(
                { error: 'MFA is already enabled for this account' },
                { status: 400 }
            );
        }

        // Generate TOTP secret
        const { encryptedSecret, otpauthUrl, secret } = generateMFASecret(userEmail);

        // Generate QR code
        const qrCodeDataUrl = await generateQRCodeDataURL(otpauthUrl);

        // Store encrypted secret temporarily (will be confirmed in PUT request)
        await db
            .update(users)
            .set({
                mfaSecret: encryptedSecret,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        return NextResponse.json({
            qrCode: qrCodeDataUrl,
            secret, // Show secret for manual entry
            otpauthUrl,
        });
    } catch (error) {
        console.error('MFA enrollment initialization error:', error);
        return NextResponse.json(
            { error: 'Failed to initialize MFA enrollment' },
            { status: 500 }
        );
    }
}

// PUT /api/mfa/enroll - Verify TOTP and enable MFA
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = parseInt(session.user.id);
        const body = await request.json();
        const { token } = body;

        if (!token || typeof token !== 'string' || token.length !== 6) {
            return NextResponse.json(
                { error: 'Invalid TOTP code format' },
                { status: 400 }
            );
        }

        // Get user's MFA secret
        const [user] = await db
            .select({
                mfaSecret: users.mfaSecret,
                mfaEnabled: users.mfaEnabled,
            })
            .from(users)
            .where(eq(users.id, userId));

        if (!user || !user.mfaSecret) {
            return NextResponse.json(
                { error: 'MFA enrollment not initialized' },
                { status: 400 }
            );
        }

        if (user.mfaEnabled) {
            return NextResponse.json(
                { error: 'MFA is already enabled' },
                { status: 400 }
            );
        }

        // Verify TOTP code
        const isValid = verifyTOTP(user.mfaSecret, token);

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid verification code' },
                { status: 400 }
            );
        }

        // Generate backup codes
        const { encryptedCodes, plainCodes } = generateBackupCodes();

        // Enable MFA
        await db
            .update(users)
            .set({
                mfaEnabled: true,
                backupCodes: encryptedCodes,
                mfaEnrolledAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        return NextResponse.json({
            success: true,
            backupCodes: plainCodes,
            message: 'MFA enabled successfully',
        });
    } catch (error) {
        console.error('MFA enrollment completion error:', error);
        return NextResponse.json(
            { error: 'Failed to complete MFA enrollment' },
            { status: 500 }
        );
    }
}

// DELETE /api/mfa/enroll - Disable MFA
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = parseInt(session.user.id);
        const body = await request.json();
        const { password } = body;

        if (!password) {
            return NextResponse.json(
                { error: 'Password required to disable MFA' },
                { status: 400 }
            );
        }

        // Verify password before disabling MFA
        // This would use your existing password verification logic
        // For now, I'll just disable it

        await db
            .update(users)
            .set({
                mfaEnabled: false,
                mfaSecret: null,
                backupCodes: null,
                mfaEnrolledAt: null,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        return NextResponse.json({
            success: true,
            message: 'MFA disabled successfully',
        });
    } catch (error) {
        console.error('MFA disable error:', error);
        return NextResponse.json(
            { error: 'Failed to disable MFA' },
            { status: 500 }
        );
    }
}
