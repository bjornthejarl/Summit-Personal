// TEMPORARY: API endpoint to clear all clients
// DELETE THIS FILE AFTER USE!

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clients } from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/getAuthInfo';

export async function DELETE(request: NextRequest) {
    return withAuth(request, async (authInfo) => {
        try {
            // Only allow admins
            if (authInfo.role !== 'admin') {
                return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
            }

            // Delete all clients for this company
            const result = await db
                .delete(clients)
                .returning({ id: clients.id });

            return NextResponse.json({
                message: 'All clients deleted',
                count: result.length
            });
        } catch (error: any) {
            console.error('Error clearing clients:', error);
            return NextResponse.json(
                { message: 'Failed to clear clients', error: error.message },
                { status: 500 }
            );
        }
    });
}
