import { Metadata } from 'next';
import { requireClientAuth } from '@/lib/auth/client/utils';
import { db } from '@/lib/db';
import { quotes, quoteItems, companies } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
    title: 'Quote Details',
    description: 'View quote details',
};

export default async function QuoteDetailPage({
    params
}: {
    params: Promise<{ quoteId: string }>
}) {
    const { quoteId } = await params;
    const session = await requireClientAuth();

    const quoteIdNum = parseInt(quoteId);
    if (isNaN(quoteIdNum)) {
        notFound();
    }

    // Get quote with items and company info
    const [quote] = await db
        .select({
            id: quotes.id,
            quoteNumber: quotes.quoteNumber,
            status: quotes.status,
            issueDate: quotes.issueDate,
            expiryDate: quotes.expiryDate,
            subtotal: quotes.subtotal,
            tax: quotes.tax,
            total: quotes.total,
            notes: quotes.notes,
            acceptedAt: quotes.acceptedAt,
            companyName: companies.name,
            companyEmail: companies.email,
            companyPhone: companies.phone,
            companyAddress: companies.address,
        })
        .from(quotes)
        .innerJoin(companies, eq(quotes.companyId, companies.id))
        .where(
            and(
                eq(quotes.id, quoteIdNum),
                eq(quotes.clientId, session.clientId),
                eq(quotes.softDelete, false)
            )
        );

    if (!quote) {
        notFound();
    }

    // Get quote items
    const items = await db
        .select()
        .from(quoteItems)
        .where(eq(quoteItems.quoteId, quoteIdNum));

    const isExpired = new Date(quote.expiryDate) < new Date();
    const canAccept = quote.status === 'sent' && !isExpired;

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-6">
                <Link href="/portal/quotes" className="text-primary hover:text-primary/80 text-sm">
                    ← Back to Quotes
                </Link>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                {/* Quote Header */}
                <div className="px-6 py-5 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Quote #{quote.quoteNumber}
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                From: {quote.companyName}
                            </p>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                quote.status === 'expired' || isExpired ? 'bg-gray-100 text-gray-800' :
                                    'bg-blue-100 text-blue-800'
                            }`}>
                            {isExpired && quote.status === 'sent' ? 'Expired' : quote.status}
                        </span>
                    </div>
                </div>

                {/* Quote Info */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase">Issue Date</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {new Date(quote.issueDate).toLocaleDateString()}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase">Expiry Date</dt>
                            <dd className={`mt-1 text-sm ${isExpired ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                                {new Date(quote.expiryDate).toLocaleDateString()}
                            </dd>
                        </div>
                        {quote.acceptedAt && (
                            <div>
                                <dt className="text-xs font-medium text-gray-500 uppercase">Accepted On</dt>
                                <dd className="mt-1 text-sm text-green-600 font-medium">
                                    {new Date(quote.acceptedAt).toLocaleDateString()}
                                </dd>
                            </div>
                        )}
                    </dl>
                </div>

                {/* Items Table */}
                <div className="px-6 py-4">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Items</h2>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">Description</th>
                                <th className="text-right text-xs font-medium text-gray-500 uppercase py-2">Qty</th>
                                <th className="text-right text-xs font-medium text-gray-500 uppercase py-2">Unit Price</th>
                                <th className="text-right text-xs font-medium text-gray-500 uppercase py-2">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {items.map((item) => (
                                <tr key={item.id}>
                                    <td className="py-3 text-sm text-gray-900">{item.description}</td>
                                    <td className="py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                                    <td className="py-3 text-sm text-gray-900 text-right">
                                        ${parseFloat(item.unitPrice).toFixed(2)}
                                    </td>
                                    <td className="py-3 text-sm text-gray-900 text-right font-medium">
                                        ${parseFloat(item.amount).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex justify-end">
                        <dl className="w-64 space-y-2">
                            <div className="flex justify-between text-sm">
                                <dt className="text-gray-500">Subtotal</dt>
                                <dd className="text-gray-900">${parseFloat(quote.subtotal).toFixed(2)}</dd>
                            </div>
                            <div className="flex justify-between text-sm">
                                <dt className="text-gray-500">Tax</dt>
                                <dd className="text-gray-900">${parseFloat(quote.tax || '0').toFixed(2)}</dd>
                            </div>
                            <div className="flex justify-between text-base font-medium pt-2 border-t border-gray-200">
                                <dt className="text-gray-900">Total</dt>
                                <dd className="text-gray-900">${parseFloat(quote.total).toFixed(2)}</dd>
                            </div>
                        </dl>
                    </div>
                </div>

                {/* Notes */}
                {quote.notes && (
                    <div className="px-6 py-4 border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-900 mb-2">Notes</h3>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
                    </div>
                )}

                {/* Actions */}
                {canAccept && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <div className="flex justify-end gap-3">
                            <form action={`/api/portal/quotes/${quote.id}/reject`} method="POST">
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Decline Quote
                                </button>
                            </form>
                            <form action={`/api/portal/quotes/${quote.id}/accept`} method="POST">
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
                                >
                                    Accept Quote
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Status Messages */}
                {quote.status === 'accepted' && (
                    <div className="px-6 py-4 bg-green-50 border-t border-green-200">
                        <p className="text-sm text-green-800">
                            ✓ You accepted this quote on {new Date(quote.acceptedAt!).toLocaleDateString()}
                        </p>
                    </div>
                )}
                {quote.status === 'rejected' && (
                    <div className="px-6 py-4 bg-red-50 border-t border-red-200">
                        <p className="text-sm text-red-800">
                            This quote was declined.
                        </p>
                    </div>
                )}
                {isExpired && quote.status === 'sent' && (
                    <div className="px-6 py-4 bg-gray-100 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                            This quote has expired. Please contact us if you'd like a new quote.
                        </p>
                    </div>
                )}

                {/* Company Contact */}
                <div className="px-6 py-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Questions?</h3>
                    <p className="text-sm text-gray-600">
                        Contact {quote.companyName} at{' '}
                        <a href={`mailto:${quote.companyEmail}`} className="text-primary hover:underline">
                            {quote.companyEmail}
                        </a>
                        {quote.companyPhone && (
                            <> or call <a href={`tel:${quote.companyPhone}`} className="text-primary hover:underline">{quote.companyPhone}</a></>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
