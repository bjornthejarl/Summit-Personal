// TEMPORARY: Clear all clients and related data
// Access this URL once: /api/temp-clear-clients
// DELETE THIS FILE AFTER USE!

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clients, quotes, quoteItems, invoices, invoiceItems } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
    try {
        // Delete in order: quote_items -> quotes -> invoice_items -> invoices -> clients

        // 1. Delete all quote items
        await db.delete(quoteItems);

        // 2. Delete all quotes
        const deletedQuotes = await db.delete(quotes).returning({ id: quotes.id });

        // 3. Delete all invoice items
        await db.delete(invoiceItems);

        // 4. Delete all invoices
        const deletedInvoices = await db.delete(invoices).returning({ id: invoices.id });

        // 5. Delete all clients
        const deletedClients = await db.delete(clients).returning({ id: clients.id });

        return NextResponse.json({
            success: true,
            message: 'All data cleared',
            deleted: {
                clients: deletedClients.length,
                quotes: deletedQuotes.length,
                invoices: deletedInvoices.length
            }
        });
    } catch (error: any) {
        console.error('Error clearing data:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to clear data',
            error: error.message
        }, { status: 500 });
    }
}
