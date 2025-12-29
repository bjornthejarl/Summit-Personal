import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { db } from '@/lib/db';
import { users, clients, accountDeletionRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logAnonymization, getClientIp } from '@/lib/audit';
import { anonymize } from '@/lib/crypto';
import { isEUCountry } from '@/lib/countries';

/**
 * Account Deletion Endpoint
 * 
 * Handles GDPR right to erasure with geo-based rules:
 * - EU users: Immediate deletion/anonymization
 * - US users: Financial records retained for 7 years, account anonymized
 */

// POST - Request account deletion
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { reason } = body;

        const userId = parseInt(session.user.id);

        // Get user details
        const [user] = await db
            .select({
                id: users.id,
                email: users.email,
                country: users.country,
                companyId: users.companyId,
            })
            .from(users)
            .where(eq(users.id, userId));

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const isEU = isEUCountry(user.country);

        // Check for existing pending request
        const [existingRequest] = await db
            .select()
            .from(accountDeletionRequests)
            .where(eq(accountDeletionRequests.userId, userId));

        if (existingRequest && existingRequest.status === 'pending') {
            return NextResponse.json(
                { error: 'A deletion request is already pending' },
                { status: 400 }
            );
        }

        // Calculate financial records retention date (7 years for US)
        const financialRecordsUntil = isEU
            ? null
            : new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000);

        // Create deletion request
        await db.insert(accountDeletionRequests).values({
            userId,
            reason: reason || null,
            country: user.country,
            status: 'pending',
            financialRecordsUntil,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // For EU users, process immediately
        if (isEU) {
            await processAccountDeletion(userId, user.email, user.companyId, getClientIp(request.headers));

            return NextResponse.json({
                message: 'Account deletion completed. Your data has been anonymized.',
                status: 'completed',
                immediate: true,
            });
        }

        // For non-EU users, return pending status
        return NextResponse.json({
            message: 'Account deletion request submitted. Your account will be anonymized, but financial records will be retained for 7 years as required by law.',
            status: 'pending',
            financialRecordsUntil: financialRecordsUntil?.toISOString(),
        });
    } catch (error) {
        console.error('Account deletion error:', error);
        return NextResponse.json(
            { error: 'Failed to process deletion request' },
            { status: 500 }
        );
    }
}

// GET - Check deletion request status
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

        const [deletionRequest] = await db
            .select()
            .from(accountDeletionRequests)
            .where(eq(accountDeletionRequests.userId, userId));

        if (!deletionRequest) {
            return NextResponse.json({
                hasRequest: false,
            });
        }

        return NextResponse.json({
            hasRequest: true,
            status: deletionRequest.status,
            financialRecordsUntil: deletionRequest.financialRecordsUntil,
            createdAt: deletionRequest.createdAt,
        });
    } catch (error) {
        console.error('Get deletion status error:', error);
        return NextResponse.json(
            { error: 'Failed to get deletion status' },
            { status: 500 }
        );
    }
}

/**
 * Process account deletion - anonymize all user data
 */
async function processAccountDeletion(
    userId: number,
    userEmail: string,
    companyId: number | null,
    ipAddress?: string
): Promise<void> {
    const tablesAnonymized: string[] = [];

    // Anonymize user record
    await db
        .update(users)
        .set({
            name: anonymize(userEmail),
            email: `deleted-${userId}@anonymized.local`,
            password: null,
            emailVerified: false,
            verificationToken: null,
            softDelete: true,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    tablesAnonymized.push('users');

    // Anonymize client records if user has company
    if (companyId) {
        // Note: We keep financial records (invoices, quotes) but anonymize PII
        const companyClients = await db
            .select({ id: clients.id, email: clients.email })
            .from(clients)
            .where(eq(clients.companyId, companyId));

        for (const client of companyClients) {
            if (client.email) {
                await db
                    .update(clients)
                    .set({
                        name: anonymize(client.email),
                        email: `anonymized-${client.id}@anonymized.local`,
                        phone: null,
                        address: null,
                        updatedAt: new Date(),
                    })
                    .where(eq(clients.id, client.id));
            }
        }
        tablesAnonymized.push('clients');
    }

    // Update deletion request status
    await db
        .update(accountDeletionRequests)
        .set({
            status: 'completed',
            processedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(accountDeletionRequests.userId, userId));

    // Log anonymization
    await logAnonymization(userId, userEmail, tablesAnonymized, userId, ipAddress);
}
