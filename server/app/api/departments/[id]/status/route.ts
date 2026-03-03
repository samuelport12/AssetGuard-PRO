import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = verifyToken(request);
    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    try {
        const { id } = params;

        const department = await prisma.department.findUnique({ where: { id } });
        if (!department) {
            return NextResponse.json(
                { error: 'Setor não encontrado' },
                { status: 404 }
            );
        }

        const newStatus = !department.isActive;

        const updated = await prisma.department.update({
            where: { id },
            data: { isActive: newStatus },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                userName: user.fullName,
                action: 'UPDATE',
                targetType: 'DEPARTMENT',
                targetId: id,
                details: `Setor ${newStatus ? 'ativado' : 'desativado'}: ${department.name} (Centro de Custo: ${department.costCenterCode})`,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Toggle department status error:', error);
        return NextResponse.json(
            { error: 'Erro ao alterar status do setor' },
            { status: 500 }
        );
    }
}
