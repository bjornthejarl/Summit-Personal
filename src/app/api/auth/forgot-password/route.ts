import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { sendReactEmail } from '@/lib/email';
import { PasswordResetEmail } from '@/emails/PasswordResetEmail';
import { hashPassword } from '@/lib/auth/argon2';

const requestSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
});

const resetSchema = z.object({
    token: z.string(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = requestSchema.parse(body);

        // Find user by email
        const [user] = await db
            .select({ id: users.id, email: users.email, name: users.name })
            .from(users)
            .where(eq(users.email, email));

        // Don't reveal if user exists or not (security)
        if (!user) {
            return NextResponse.json({
                message: 'If an account exists with that email, a password reset link has been sent.',
            });
        }

        // Generate reset token
        const resetToken = randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Update user with reset token
        await db
            .update(users)
            .set({
                verificationToken: resetToken,
                verificationExpires: resetExpires,
                updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));

        // Send reset email
        const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://billing.valpha.dev';
        const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;

        try {
            await sendReactEmail({
                to: user.email,
                subject: 'Reset your password - vAlpha',
                react: PasswordResetEmail({
                    userName: user.name || 'User',
                    resetUrl,
                }),
            });
        } catch (emailError) {
            console.error('Failed to send password reset email:', emailError);
        }

        return NextResponse.json({
            message: 'If an account exists with that email, a password reset link has been sent.',
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { message: 'Invalid email address' },
                { status: 400 }
            );
        }

        console.error('Forgot password error:', error);
        return NextResponse.json(
            { message: 'Failed to process password reset request' },
            { status: 500 }
        );
    }
}

/**
 * Reset password with token
 * PUT /api/auth/forgot-password
 */
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, password } = resetSchema.parse(body);

        // Find user with valid token
        const [user] = await db
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(eq(users.verificationToken, token));

        if (!user) {
            return NextResponse.json(
                { message: 'Invalid or expired reset link' },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedPassword = await hashPassword(password);

        // Update password and clear token
        await db
            .update(users)
            .set({
                password: hashedPassword,
                verificationToken: null,
                verificationExpires: null,
                updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));

        return NextResponse.json({
            message: 'Password reset successfully',
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { message: 'Invalid request data' },
                { status: 400 }
            );
        }

        console.error('Password reset error:', error);
        return NextResponse.json(
            { message: 'Failed to reset password' },
            { status: 500 }
        );
    }
}
