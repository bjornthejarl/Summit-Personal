import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { ZodError } from 'zod';
import { withAuth } from '@/lib/auth/getAuthInfo';

// Item validation schema (for updates)
const updateItemSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255).optional(),
    description: z.string().optional(),
    defaultUnitPrice: z.number().min(0, 'Price must be positive').optional(),
    category: z.string().max(100).optional(),
    sku: z.string().max(100).optional(),
    isActive: z.boolean().optional(),
});

type ItemResponse = {
    id: number;
    companyId: number;
    name: string;
    description: string | null;
    defaultUnitPrice: string;
    category: string | null;
    sku: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
};

type ErrorResponse = {
    message: string;
    errors?: any;
};

// GET /api/items/[itemId] - Get item by ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ itemId: string }> }
) {
    const { itemId: itemIdStr } = await params;

    return withAuth<ItemResponse | ErrorResponse>(request, async (authInfo) => {
        try {
            const { companyId } = authInfo;
            const itemId = parseInt(itemIdStr);

            if (isNaN(itemId)) {
                return NextResponse.json(
                    { message: 'Invalid item ID' },
                    { status: 400 }
                );
            }

            const [item] = await db
                .select()
                .from(items)
                .where(
                    and(
                        eq(items.id, itemId),
                        eq(items.companyId, companyId),
                        eq(items.softDelete, false)
                    )
                );

            if (!item) {
                return NextResponse.json(
                    { message: 'Item not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json(item);
        } catch (error) {
            console.error('Error fetching item:', error);
            return NextResponse.json(
                { message: 'Internal server error' },
                { status: 500 }
            );
        }
    });
}

// PUT /api/items/[itemId] - Update item
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ itemId: string }> }
) {
    const { itemId: itemIdStr } = await params;

    return withAuth<ItemResponse | ErrorResponse>(request, async (authInfo) => {
        try {
            const { companyId } = authInfo;
            const itemId = parseInt(itemIdStr);

            if (isNaN(itemId)) {
                return NextResponse.json(
                    { message: 'Invalid item ID' },
                    { status: 400 }
                );
            }

            const body = await request.json();
            const validatedData = updateItemSchema.parse(body);

            // Check if item exists and belongs to company
            const [existingItem] = await db
                .select()
                .from(items)
                .where(
                    and(
                        eq(items.id, itemId),
                        eq(items.companyId, companyId),
                        eq(items.softDelete, false)
                    )
                );

            if (!existingItem) {
                return NextResponse.json(
                    { message: 'Item not found' },
                    { status: 404 }
                );
            }

            // Check for SKU conflicts if updating SKU
            if (validatedData.sku && validatedData.sku !== existingItem.sku) {
                const [conflictItem] = await db
                    .select({ id: items.id })
                    .from(items)
                    .where(
                        and(
                            eq(items.companyId, companyId),
                            eq(items.sku, validatedData.sku),
                            eq(items.softDelete, false)
                        )
                    );

                if (conflictItem && conflictItem.id !== itemId) {
                    return NextResponse.json(
                        { message: 'Item with this SKU already exists' },
                        { status: 409 }
                    );
                }
            }

            // Update item
            const updateData: any = {
                ...validatedData,
                updatedAt: new Date(),
            };

            // Convert price to string if provided
            if (validatedData.defaultUnitPrice !== undefined) {
                updateData.defaultUnitPrice = validatedData.defaultUnitPrice.toString();
            }

            const [updatedItem] = await db
                .update(items)
                .set(updateData)
                .where(eq(items.id, itemId))
                .returning();

            return NextResponse.json(updatedItem);
        } catch (error) {
            console.error('Error updating item:', error);

            if (error instanceof ZodError) {
                return NextResponse.json(
                    { message: 'Validation error', errors: error.errors },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { message: 'Internal server error' },
                { status: 500 }
            );
        }
    });
}

// DELETE /api/items/[itemId] - Soft delete item
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ itemId: string }> }
) {
    const { itemId: itemIdStr } = await params;

    return withAuth<{ message: string } | ErrorResponse>(request, async (authInfo) => {
        try {
            const { companyId } = authInfo;
            const itemId = parseInt(itemIdStr);

            if (isNaN(itemId)) {
                return NextResponse.json(
                    { message: 'Invalid item ID' },
                    { status: 400 }
                );
            }

            // Check if item exists and belongs to company
            const [existingItem] = await db
                .select()
                .from(items)
                .where(
                    and(
                        eq(items.id, itemId),
                        eq(items.companyId, companyId),
                        eq(items.softDelete, false)
                    )
                );

            if (!existingItem) {
                return NextResponse.json(
                    { message: 'Item not found' },
                    { status: 404 }
                );
            }

            // Soft delete the item
            await db
                .update(items)
                .set({
                    softDelete: true,
                    updatedAt: new Date(),
                })
                .where(eq(items.id, itemId));

            return NextResponse.json({ message: 'Item deleted successfully' });
        } catch (error) {
            console.error('Error deleting item:', error);
            return NextResponse.json(
                { message: 'Internal server error' },
                { status: 500 }
            );
        }
    });
}
