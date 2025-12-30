import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { and, asc, desc, eq, sql, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import { ZodError } from 'zod';
import { withAuth } from '@/lib/auth/getAuthInfo';

// Item validation schema
const itemSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().optional(),
    defaultUnitPrice: z.number().min(0, 'Price must be positive'),
    category: z.string().max(100).optional(),
    sku: z.string().max(100).optional(),
    isActive: z.boolean().default(true),
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

type ItemListResponse = {
    data: ItemResponse[];
    meta: {
        total: number;
        page: number;
        limit: number;
        pageCount: number;
    };
};

type ErrorResponse = {
    message: string;
    errors?: any;
};

// GET /api/items - Get all items for the company
export async function GET(request: NextRequest) {
    return withAuth<ItemListResponse | ErrorResponse>(request, async (authInfo) => {
        try {
            const { companyId } = authInfo;

            // Get query parameters
            const { searchParams } = new URL(request.url);
            const page = parseInt(searchParams.get('page') || '1');
            const limit = parseInt(searchParams.get('limit') || '50');
            const order = searchParams.get('order') || 'asc';
            const search = searchParams.get('search') || '';
            const category = searchParams.get('category') || '';
            const activeOnly = searchParams.get('activeOnly') === 'true';
            const offset = (page - 1) * limit;

            // Build where conditions
            const conditions = [
                eq(items.companyId, companyId),
                eq(items.softDelete, false)
            ];

            if (activeOnly) {
                conditions.push(eq(items.isActive, true));
            }

            // Add search filter (search in name, description, SKU, category)
            if (search) {
                conditions.push(
                    or(
                        ilike(items.name, `%${search}%`),
                        ilike(items.description, `%${search}%`),
                        ilike(items.sku, `%${search}%`),
                        ilike(items.category, `%${search}%`)
                    )!
                );
            }

            // Add category filter
            if (category) {
                conditions.push(eq(items.category, category));
            }

            // Count total records for pagination
            const countResult = await db
                .select({ count: sql`COUNT(*)` })
                .from(items)
                .where(and(...conditions));

            const total = Number(countResult[0].count);

            // Get items with pagination
            const itemList = await db
                .select()
                .from(items)
                .where(and(...conditions))
                .orderBy(order === 'asc' ? asc(items.name) : desc(items.name))
                .limit(limit)
                .offset(offset);

            return NextResponse.json({
                data: itemList,
                meta: {
                    total,
                    page,
                    limit,
                    pageCount: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            console.error('Error fetching items:', error);
            return NextResponse.json(
                { message: 'Internal server error' },
                { status: 500 }
            );
        }
    });
}

// POST /api/items - Create a new item
export async function POST(request: NextRequest) {
    return withAuth<ItemResponse | ErrorResponse>(request, async (authInfo) => {
        try {
            const { companyId } = authInfo;
            const body = await request.json();

            // Validate item data
            const validatedData = itemSchema.parse(body);

            // Check if item with same SKU already exists for this company (if SKU provided)
            if (validatedData.sku) {
                const existingItem = await db
                    .select({ id: items.id })
                    .from(items)
                    .where(
                        and(
                            eq(items.companyId, companyId),
                            eq(items.sku, validatedData.sku),
                            eq(items.softDelete, false)
                        )
                    );

                if (existingItem.length > 0) {
                    return NextResponse.json(
                        { message: 'Item with this SKU already exists' },
                        { status: 409 }
                    );
                }
            }

            // Create item
            const [newItem] = await db
                .insert(items)
                .values({
                    companyId,
                    name: validatedData.name,
                    description: validatedData.description || null,
                    defaultUnitPrice: validatedData.defaultUnitPrice.toString(),
                    category: validatedData.category || null,
                    sku: validatedData.sku || null,
                    isActive: validatedData.isActive,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .returning();

            return NextResponse.json(newItem, { status: 201 });
        } catch (error) {
            console.error('Error creating item:', error);

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
