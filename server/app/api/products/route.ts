import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
    const user = verifyToken(request);
    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(PAGE_SIZE), 10)));
        const search = searchParams.get('search') || '';
        const category = searchParams.get('category') || '';
        const lowStock = searchParams.get('lowStock') === 'true';

        // Build where clause
        const where: Prisma.ProductWhereInput = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (category) {
            where.category = category;
        }

        // lowStock: compare two columns via raw SQL (Prisma limitation)
        if (lowStock) {
            const searchCond = search
                ? Prisma.sql`AND (LOWER(name) LIKE LOWER(${`%${search}%`}) OR barcode LIKE ${`%${search}%`})`
                : Prisma.empty;
            const catCond = category
                ? Prisma.sql`AND category = ${category}`
                : Prisma.empty;

            const countResult = await prisma.$queryRaw<[{ count: bigint }]>(
                Prisma.sql`SELECT COUNT(*)::bigint as count FROM "Product" WHERE quantity <= "minStock" ${searchCond} ${catCond}`
            );
            const total = Number(countResult[0].count);
            const totalPages = Math.max(1, Math.ceil(total / limit));
            const safePage = Math.min(page, totalPages);
            const offset = (safePage - 1) * limit;

            const products = await prisma.$queryRaw(
                Prisma.sql`SELECT * FROM "Product" WHERE quantity <= "minStock" ${searchCond} ${catCond} ORDER BY name ASC LIMIT ${limit} OFFSET ${offset}`
            );

            const categories = await prisma.product.findMany({
                select: { category: true },
                distinct: ['category'],
                orderBy: { category: 'asc' },
            });

            return NextResponse.json({
                products,
                total,
                page: safePage,
                totalPages,
                limit,
                filterOptions: { categories: categories.map(c => c.category) },
            });
        }

        // Standard paginated query
        const total = await prisma.product.count({ where });
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, totalPages);

        const products = await prisma.product.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: (safePage - 1) * limit,
            take: limit,
        });

        const categories = await prisma.product.findMany({
            select: { category: true },
            distinct: ['category'],
            orderBy: { category: 'asc' },
        });

        return NextResponse.json({
            products,
            total,
            page: safePage,
            totalPages,
            limit,
            filterOptions: { categories: categories.map(c => c.category) },
        });
    } catch (error) {
        console.error('Get products error:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar produtos' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const user = verifyToken(request);
    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, barcode, quantity, minStock, location, category, unitValue } = body;

        if (!name || !barcode || quantity == null || minStock == null || !location || !category || unitValue == null) {
            return NextResponse.json({ error: 'Campos obrigatórios não preenchidos' }, { status: 400 });
        }

        const existing = await prisma.product.findUnique({ where: { barcode } });
        if (existing) {
            return NextResponse.json({ error: 'Já existe um produto com este código de barras' }, { status: 409 });
        }

        const product = await prisma.product.create({
            data: { name, barcode, quantity, minStock, location, category, unitValue },
        });

        // Record the initial stock as an ENTRADA movement so historical cost
        // tracking starts from day one (unitCost is locked to unitValue at creation).
        if (quantity > 0) {
            await prisma.stockMovement.create({
                data: {
                    productId: product.id,
                    type: 'ENTRADA',
                    quantity,
                    unitCost: unitValue,
                    reason: 'Estoque inicial',
                    userId: user.id,
                    userName: user.fullName,
                },
            });
        }

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                userName: user.fullName,
                action: 'CREATE',
                targetType: 'PRODUCT',
                targetId: product.id,
                details: `Produto "${name}" cadastrado com ${quantity} unidades`,
            },
        });

        return NextResponse.json(product, { status: 201 });
    } catch (error) {
        console.error('Create product error:', error);
        return NextResponse.json(
            { error: 'Erro ao criar produto' },
            { status: 500 }
        );
    }
}
