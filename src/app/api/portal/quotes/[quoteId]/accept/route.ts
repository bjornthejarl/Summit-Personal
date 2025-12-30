import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/lib/auth/client/utils';
import { db } from '@/lib/db';
import { quotes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ quoteId: string }> }
) {
    const { quoteId } = await params;
    const session = await getClientSession();

    if (!session) {
        return NextResponse.redirect(new URL('/portal/login', request.url));
    }

    const quoteIdNum = parseInt(quoteId);
    if (isNaN(quoteIdNum)) {
        return NextResponse.json({ error: 'Invalid quote ID' }, { status: 400 });
    }

    try {
        // Get the quote to verify ownership and status
        const [quote] = await db
            .select()
            .from(quotes)
            .where(
                and(
                    eq(quotes.id, quoteIdNum),
                    eq(quotes.clientId, session.clientId),
                    eq(quotes.softDelete, false)
                )
            );

        if (!quote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        // Check if quote can be accepted
        if (quote.status !== 'sent') {
            return NextResponse.json({ error: 'Quote cannot be accepted' }, { status: 400 });
        }

        // Check if quote is expired
        if (new Date(quote.expiryDate) < new Date()) {
            return NextResponse.json({ error: 'Quote has expired' }, { status: 400 });
        }

        // Update quote to accepted
        await db
            .update(quotes)
            .set({
                status: 'accepted',
                acceptedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(quotes.id, quoteIdNum));

        // Redirect back to quote page
        return NextResponse.redirect(new URL(`/portal/quotes/${quoteId}`, request.url));
    } catch (error) {
        console.error('Error accepting quote:', error);
        return NextResponse.json({ error: 'Failed to accept quote' }, { status: 500 });
    }
}
