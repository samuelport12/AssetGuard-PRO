import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const user = verifyToken(request);
    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const [products, assets] = await Promise.all([
            prisma.product.findMany(),
            prisma.asset.findMany(),
        ]);

        // Since product.unitValue now always reflects the true weighted average
        // cost (updated on every ENTRADA), we can compute total stock value directly.
        const totalStockValue = products.reduce(
            (acc, p) => acc + p.quantity * p.unitValue,
            0
        );

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
