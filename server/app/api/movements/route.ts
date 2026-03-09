import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const user = verifyToken(request);
    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);

        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');
        const productId = searchParams.get('productId');
        const type = searchParams.get('type');
        const supplierId = searchParams.get('supplierId'); // maps to reason field
        const search = searchParams.get('search');
        const barcode = searchParams.get('barcode');
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
        const skip = (page - 1) * limit;

        // Default: first day of current month to today
        const now = new Date();
        const startDate = startDateParam
            ? new Date(startDateParam + 'T00:00:00')
            : new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);

        const endDate = endDateParam
            ? new Date(endDateParam + 'T23:59:59')
            : new Date();
        endDate.setHours(23, 59, 59, 999);

        // Base where clause (without type filter — used for summary and supplier list)
        const baseWhere: Record<string, unknown> = {
            createdAt: { gte: startDate, lte: endDate },
        };
        if (productId) baseWhere.productId = productId;
        if (supplierId) baseWhere.reason = supplierId;
        if (barcode) {
            baseWhere.product = { barcode: { contains: barcode, mode: 'insensitive' } };
        } else if (search) {
            baseWhere.product = { name: { contains: search, mode: 'insensitive' } };
        }

        // Where clause with optional type filter (used for paginated table results)
        const tableWhere = { ...baseWhere } as Record<string, unknown>;
        if (type === 'ENTRADA' || type === 'SAIDA') tableWhere.type = type;

        // Paginated movements + total count
        const [movements, total] = await Promise.all([
            prisma.stockMovement.findMany({
                where: tableWhere,
                include: {
                    product: { select: { name: true } },
                    department: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.stockMovement.count({ where: tableWhere }),
        ]);

        // Summary aggregates — always over the full period (ignoring type filter)
        const [entradaRows, saidaAgg, supplierRows] = await Promise.all([
            prisma.stockMovement.findMany({
                where: { ...baseWhere, type: 'ENTRADA' },
                select: { quantity: true, unitCost: true },
            }),
            prisma.stockMovement.aggregate({
                where: { ...baseWhere, type: 'SAIDA' },
                _sum: { quantity: true },
            }),
            // Unique reasons from ENTRADA movements in the full period (no product/search filter)
            prisma.stockMovement.findMany({
                where: {
                    createdAt: { gte: startDate, lte: endDate },
                    type: 'ENTRADA',
                },
                select: { reason: true },
                distinct: ['reason'],
                orderBy: { reason: 'asc' },
            }),
        ]);

        const totalEntradas = entradaRows.reduce((sum, m) => sum + m.quantity, 0);
        const totalSpent = entradaRows.reduce((sum, m) => sum + m.quantity * m.unitCost, 0);
        const avgUnitCost =
            entradaRows.length > 0
                ? entradaRows.reduce((sum, m) => sum + m.unitCost, 0) / entradaRows.length
                : 0;
        const totalSaidas = saidaAgg._sum.quantity ?? 0;

        const suppliers = supplierRows.map((r) => r.reason).filter(Boolean);

        return NextResponse.json({
            movements: movements.map((m) => ({
                id: m.id,
                productId: m.productId,
                productName: m.product.name,
                type: m.type,
                quantity: m.quantity,
                unitCost: m.unitCost,
                reason: m.reason,
                departmentId: m.departmentId ?? null,
                departmentName: m.department?.name ?? null,
                userId: m.userId,
                userName: m.userName,
                createdAt: m.createdAt.toISOString(),
            })),
            total,
            page,
            totalPages: Math.ceil(total / limit),
            limit,
            summary: {
                totalEntradas,
                totalSaidas,
                totalSpent,
                avgUnitCost,
            },
            filterOptions: { suppliers },
        });
    } catch (error) {
        console.error('Movements route error:', error);
        return NextResponse.json({ error: 'Erro ao buscar movimentações' }, { status: 500 });
    }
}
