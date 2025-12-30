// TEMPORARY: Clear all clients
// Access this URL once: /api/temp-clear-clients
// DELETE THIS FILE AFTER USE!

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clients } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
    try {
        // Delete all clients
        const result = await db
            .delete(clients)
            .returning({ id: clients.id });

        return NextResponse.json({
            success: true,
            message: 'All clients deleted',
            count: result.length
        });
    } catch (error: any) {
        console.error('Error clearing clients:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to clear clients',
            error: error.message
        }, { status: 500 });
    }
}
