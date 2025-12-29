import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, lt, and, isNull } from 'drizzle-orm';
import { sendReactEmail } from '@/lib/email';
import { DormancyWarningEmail } from '@/emails/DormancyWarningEmail';

/**
 * Cron job to check for dormant accounts
 * 
 * Runs daily to:
 * 1. Find accounts inactive for 11 months (330 days)
 * 2. Send warning email about upcoming dormancy
 * 3. Mark accounts as notified
 * 
 * Should be called by an external cron service (e.g., Vercel Cron, cron-job.org)
 * Protected by CRON_API_KEY
 */

const DORMANCY_WARNING_DAYS = 330; // 11 months - warn 1 month before 1 year
const DAYS_UNTIL_DORMANT = 35; // ~1 month warning

export async function GET(request: NextRequest) {
    try {
        // Verify cron API key
        const authHeader = request.headers.get('authorization');
        const cronKey = process.env.CRON_API_KEY;

        if (!cronKey || authHeader !== `Bearer ${cronKey}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Calculate the cutoff date for dormancy warning
        const warningCutoff = new Date();
        warningCutoff.setDate(warningCutoff.getDate() - DORMANCY_WARNING_DAYS);

        // Find users who:
        // 1. Haven't been active in 11 months
        // 2. Haven't been notified about dormancy yet
        // 3. Are not soft-deleted
        const inactiveUsers = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                lastActivityAt: users.lastActivityAt,
            })
            .from(users)
            .where(
                and(
                    lt(users.lastActivityAt, warningCutoff),
                    isNull(users.dormantNotifiedAt),
                    eq(users.softDelete, false)
                )
            )
            .limit(50); // Process in batches

        const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://billing.valpha.dev';
        const loginUrl = `${baseUrl}/auth/signin`;

        let sentCount = 0;
        let errorCount = 0;

        for (const user of inactiveUsers) {
            try {
                // Format last activity date
                const lastActivityDate = user.lastActivityAt
                    ? new Date(user.lastActivityAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })
                    : 'over a year ago';

                // Send warning email
                const emailResult = await sendReactEmail({
                    to: user.email,
                    subject: 'Your vAlpha account will be marked as dormant soon',
                    react: DormancyWarningEmail({
                        userName: user.name || 'Valued User',
                        lastActivityDate,
                        daysUntilDormant: DAYS_UNTIL_DORMANT,
                        loginUrl,
                    }),
                });

                if (emailResult.success) {
                    // Mark user as notified
                    await db
                        .update(users)
                        .set({
                            dormantNotifiedAt: new Date(),
                            updatedAt: new Date(),
                        })
                        .where(eq(users.id, user.id));

                    sentCount++;
                } else {
                    console.error(`Failed to send dormancy warning to ${user.email}:`, emailResult.error);
                    errorCount++;
                }
            } catch (error) {
                console.error(`Error processing user ${user.id}:`, error);
                errorCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Dormancy check complete`,
            processed: inactiveUsers.length,
            emailsSent: sentCount,
            errors: errorCount,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Dormancy check cron error:', error);
        return NextResponse.json(
            { error: 'Failed to run dormancy check' },
            { status: 500 }
        );
    }
}
