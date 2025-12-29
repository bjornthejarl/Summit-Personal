import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { sendReactEmail } from '@/lib/email';
import { VerifyEmail } from '@/emails/VerifyEmail';
import { config } from '@/lib/config';

/**
 * Resend Email Verification
 * POST /api/auth/resend-verification
 */

const requestSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = requestSchema.parse(body);

        // Find user by email
        const [user] = await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
                emailVerified: users.emailVerified,
            })
            .from(users)
            .where(eq(users.email, email));

        // Don't reveal if user exists or not (security)
        if (!user) {
            return NextResponse.json({
                message: 'If an account exists with that email, a verification link has been sent.',
            });
        }

        // If already verified, just return success
        if (user.emailVerified) {
            return NextResponse.json({
                message: 'Email is already verified. You can sign in.',
            });
        }

        // Generate new verification token
        const verificationToken = randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Update user with new token
        await db
            .update(users)
            .set({
                verificationToken,
                verificationExpires,
                updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));

        // Send verification email
        const baseUrl = config.publicUrl;
        const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;

        console.log('📧 Resending verification email to:', user.email);

        try {
            const emailResult = await sendReactEmail({
                to: user.email,
                subject: 'Verify your email - vAlpha',
                react: VerifyEmail({
                    userName: user.name || 'User',
                    verifyUrl,
                }),
            });

            if (emailResult.success) {
                console.log('✅ Verification email resent successfully to:', user.email);
            } else {
                console.error('❌ Failed to resend verification email:', emailResult.error);
            }
        } catch (emailError) {
            console.error('❌ Exception resending verification email:', emailError);
        }

        return NextResponse.json({
            message: 'If an account exists with that email, a verification link has been sent.',
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { message: 'Invalid email address' },
                { status: 400 }
            );
        }

        console.error('Resend verification error:', error);
        return NextResponse.json(
            { message: 'Failed to resend verification email' },
            { status: 500 }
        );
    }
}
