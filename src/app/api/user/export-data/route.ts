import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { db } from '@/lib/db';
import { users, clients, invoices, quotes, expenses, income } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logDataExport, getClientIp } from '@/lib/audit';
import { decryptFields } from '@/lib/crypto';

/**
 * GDPR Data Portability Endpoint
 * Allows users to export all their personal data
 */
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
        const companyId = session.user.companyId ? parseInt(session.user.companyId) : null;

        // Fetch user data
        const [userData] = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                country: users.country,
                emailVerified: users.emailVerified,
                lastActivityAt: users.lastActivityAt,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            })
            .from(users)
            .where(eq(users.id, userId));

        if (!userData) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Prepare export data
        const exportData: Record<string, unknown> = {
            exportedAt: new Date().toISOString(),
            exportVersion: '1.0',
            user: userData,
        };

        // If user has a company, export company-related data
        if (companyId) {
            // Clients
            const clientsData = await db
                .select()
                .from(clients)
                .where(and(eq(clients.companyId, companyId), eq(clients.softDelete, false)));

            // Decrypt client PII if encrypted
            exportData.clients = clientsData.map(c => {
                try {
                    return decryptFields(c, ['name', 'email', 'phone', 'address']);
                } catch {
                    return c; // Return as-is if decryption fails
                }
            });

            // Invoices (without soft-deleted)
            const invoicesData = await db
                .select({
                    id: invoices.id,
                    invoiceNumber: invoices.invoiceNumber,
                    status: invoices.status,
                    issueDate: invoices.issueDate,
                    dueDate: invoices.dueDate,
                    subtotal: invoices.subtotal,
                    tax: invoices.tax,
                    total: invoices.total,
                    currency: invoices.currency,
                    createdAt: invoices.createdAt,
                })
                .from(invoices)
                .where(and(eq(invoices.companyId, companyId), eq(invoices.softDelete, false)));

            exportData.invoices = invoicesData;

            // Quotes
            const quotesData = await db
                .select({
                    id: quotes.id,
                    quoteNumber: quotes.quoteNumber,
                    status: quotes.status,
                    issueDate: quotes.issueDate,
                    expiryDate: quotes.expiryDate,
                    total: quotes.total,
                    createdAt: quotes.createdAt,
                })
                .from(quotes)
                .where(and(eq(quotes.companyId, companyId), eq(quotes.softDelete, false)));

            exportData.quotes = quotesData;

            // Expenses summary (anonymized amounts)
            const expensesData = await db
                .select({
                    id: expenses.id,
                    amount: expenses.amount,
                    currency: expenses.currency,
                    expenseDate: expenses.expenseDate,
                    status: expenses.status,
                    createdAt: expenses.createdAt,
                })
                .from(expenses)
                .where(and(eq(expenses.companyId, companyId), eq(expenses.softDelete, false)));

            exportData.expenses = expensesData;

            // Income summary
            const incomeData = await db
                .select({
                    id: income.id,
                    amount: income.amount,
                    currency: income.currency,
                    incomeDate: income.incomeDate,
                    createdAt: income.createdAt,
                })
                .from(income)
                .where(and(eq(income.companyId, companyId), eq(income.softDelete, false)));

            exportData.income = incomeData;
        }

        // Log the export for audit trail
        await logDataExport(
            userId,
            userData.email,
            Object.keys(exportData).filter(k => k !== 'exportedAt' && k !== 'exportVersion'),
            getClientIp(request.headers)
        );

        // Return as downloadable JSON
        return new NextResponse(JSON.stringify(exportData, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="valpha-data-export-${new Date().toISOString().split('T')[0]}.json"`,
            },
        });
    } catch (error) {
        console.error('Data export error:', error);
        return NextResponse.json(
            { error: 'Failed to export data' },
            { status: 500 }
        );
    }
}
