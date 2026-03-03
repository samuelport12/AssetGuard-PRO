import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const user = verifyToken(request);
    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const [products, entryMovements, assets] = await Promise.all([
            prisma.product.findMany(),
            prisma.stockMovement.findMany({
                where: { type: 'ENTRADA' },
                select: { productId: true, quantity: true, unitCost: true },
            }),
            prisma.asset.findMany(),
        ]);

        // Build a per-product weighted average cost from historical ENTRADA records.
        // unitCost is locked at the time of each entry and is never affected by
        // subsequent price updates on the product.
        const costMap = new Map<string, { totalCost: number; totalQty: number }>();
        for (const m of entryMovements) {
            const current = costMap.get(m.productId) ?? { totalCost: 0, totalQty: 0 };
            costMap.set(m.productId, {
                totalCost: current.totalCost + (m.unitCost ?? 0) * m.quantity,
                totalQty: current.totalQty + m.quantity,
            });
        }

        const totalStockValue = products.reduce((acc, p) => {
            if (p.quantity === 0) return acc;

            const costs = costMap.get(p.id);
            if (!costs || costs.totalQty === 0) {
                console.warn(
                    `[dashboard/stats] Product "${p.name}" (${p.id}) has quantity=${p.quantity} but no ENTRADA movements. Its value is excluded from totalStockValue.`
                );
                return acc;
            }

            const unitCost = costs.totalCost / costs.totalQty;
            return acc + p.quantity * unitCost;
        }, 0);

        const lowStockCount = products.filter(
            (p) => p.quantity <= p.minStock
        ).length;

        const totalAssetsValue = assets
            .filter((a) => a.status !== 'DISPOSED')
            .reduce((acc, a) => acc + a.purchaseValue, 0);

        const activeAssetsCount = assets.filter(
            (a) => a.status === 'IN_USE'
        ).length;

        return NextResponse.json({
            totalStockValue,
            totalAssetsValue,
            lowStockCount,
            activeAssetsCount,
            totalProducts: products.length,
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar estatísticas' },
            { status: 500 }
        );
    }
}
