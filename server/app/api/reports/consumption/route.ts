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
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        // departmentIds: comma-separated list of IDs, e.g. "id1,id2,id3"
        const departmentIdsParam = searchParams.get('departmentIds');
        const departmentIds = departmentIdsParam
            ? departmentIdsParam.split(',').map(s => s.trim()).filter(Boolean)
            : [];

        // Build UTC date range from YYYY-MM-DD strings.
        const dateFilter: { gte?: Date; lte?: Date } = {};
        if (startDate) {
            dateFilter.gte = new Date(startDate + 'T00:00:00.000Z');
        }
        if (endDate) {
            dateFilter.lte = new Date(endDate + 'T23:59:59.999Z');
        }

        // Filter by createdAt (always populated) instead of movementDate
        const whereClause: any = {};
        if (startDate || endDate) {
            whereClause.createdAt = dateFilter;
        }
        // Filter by departments if provided
        if (departmentIds.length > 0) {
            whereClause.departmentId = { in: departmentIds };
        }

        // Fetch all departments for name lookup + to return as filter options
        const departments = await prisma.department.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        });
        const deptNameMap = new Map(departments.map(d => [d.id, d.name]));

        // Fetch all movements in the period with product info
        const movements = await prisma.stockMovement.findMany({
            where: whereClause,
            orderBy: { movementDate: 'desc' },
            include: {
                product: { select: { name: true, barcode: true } },
            },
        });

        // Aggregate by department
        const departmentMap = new Map<string, {
            departmentId: string;
            departmentName: string;
            totalEntradas: number;
            totalSaidas: number;
            totalExitCost: number;
        }>();

        const NO_DEPT = '__SEM_SETOR__';

        for (const m of movements) {
            const deptId = m.departmentId || NO_DEPT;
            const deptName = m.departmentId ? (deptNameMap.get(m.departmentId) || 'Setor removido') : 'Setor não informado';
            const existing = departmentMap.get(deptId) || {
                departmentId: deptId,
                departmentName: deptName,
                totalEntradas: 0,
                totalSaidas: 0,
                totalExitCost: 0,
            };

            if (m.type === 'ENTRADA') {
                existing.totalEntradas += m.quantity;
            } else {
                existing.totalSaidas += m.quantity;
                existing.totalExitCost += (m.unitCost ?? 0) * m.quantity;
            }
            departmentMap.set(deptId, existing);
        }

        const byDepartment = Array.from(departmentMap.values()).sort(
            (a, b) => b.totalSaidas - a.totalSaidas
        );

        // Top 10 most consumed products (by SAIDA quantity)
        const productMap = new Map<string, {
            productId: string;
            productName: string;
            totalSaidas: number;
        }>();

        for (const m of movements) {
            if (m.type !== 'SAIDA') continue;
            const existing = productMap.get(m.productId) || {
                productId: m.productId,
                productName: m.product.name,
                totalSaidas: 0,
            };
            existing.totalSaidas += m.quantity;
            productMap.set(m.productId, existing);
        }

        const topConsumed = Array.from(productMap.values())
            .sort((a, b) => b.totalSaidas - a.totalSaidas)
            .slice(0, 10);

        // Format movements for response (Excel export)
        const formattedMovements = movements.map((m) => ({
            date: (m.movementDate ?? m.createdAt).toISOString(),
            productName: m.product.name,
            barcode: m.product.barcode,
            quantity: m.quantity,
            type: m.type,
            departmentName: m.departmentId ? (deptNameMap.get(m.departmentId) || 'Setor removido') : 'Setor não informado',
            userName: m.userName,
            reason: m.reason,
        }));

        return NextResponse.json({
            byDepartment,
            topConsumed,
            movements: formattedMovements,
            departments: departments.map(d => ({ id: d.id, name: d.name })),
        });
    } catch (error) {
        console.error('Consumption report error:', error);
        return NextResponse.json(
            { error: 'Erro ao gerar relatório' },
            { status: 500 }
        );
    }
}
