import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';

// Validation schema for the request
const verifySchema = z.object({
    token: z.string().min(32),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = verifySchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid verification token' },
                { status: 400 }
            );
        }

        const { token } = result.data;

        // Find user with this token that hasn't expired
        const [user] = await db
            .select({
                id: users.id,
                email: users.email,
                emailVerified: users.emailVerified,
            })
            .from(users)
            .where(
                and(
                    eq(users.verificationToken, token),
                    gt(users.verificationExpires, new Date())
                )
            );

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid or expired verification token' },
                { status: 400 }
            );
        }

        if (user.emailVerified) {
            return NextResponse.json(
                { message: 'Email already verified' },
                { status: 200 }
            );
        }

        // Mark email as verified and clear token
        await db
            .update(users)
            .set({
                emailVerified: true,
                verificationToken: null,
                verificationExpires: null,
                updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));

        return NextResponse.json(
            { message: 'Email verified successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error verifying email:', error);
        return NextResponse.json(
            { error: 'An error occurred while verifying your email' },
            { status: 500 }
        );
    }
}

// GET endpoint for email verification links
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    // Use proper base URL from environment, not request.url (which is 0.0.0.0:3000 in Docker)
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://billing.valpha.dev';

    if (!token) {
        return NextResponse.redirect(new URL('/auth/portal/access?error=invalid_token', baseUrl));
    }

    // Find user with this token that hasn't expired
    const [user] = await db
        .select({
            id: users.id,
            emailVerified: users.emailVerified,
        })
        .from(users)
        .where(
            and(
                eq(users.verificationToken, token),
                gt(users.verificationExpires, new Date())
            )
        );

    if (!user) {
        return NextResponse.redirect(new URL('/auth/portal/access?error=expired_token', baseUrl));
    }

    if (!user.emailVerified) {
        // Mark email as verified
        await db
            .update(users)
            .set({
                emailVerified: true,
                verificationToken: null,
                verificationExpires: null,
                updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));
    }

    return NextResponse.redirect(new URL('/auth/portal/access?verified=true', baseUrl));
}

