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
        const body = await request.json();
        const { name, costCenterCode } = body;

        if (!name || !costCenterCode) {
            return NextResponse.json(
                { error: 'Nome e código do centro de custo são obrigatórios' },
                { status: 400 }
            );
        }

        const department = await prisma.department.findUnique({ where: { id } });
        if (!department) {
            return NextResponse.json(
                { error: 'Setor não encontrado' },
                { status: 404 }
            );
        }

        // Check costCenterCode uniqueness if changed
        if (costCenterCode !== department.costCenterCode) {
            const existing = await prisma.department.findUnique({
                where: { costCenterCode },
            });
            if (existing) {
                return NextResponse.json(
                    { error: 'Já existe um setor com este código de centro de custo' },
                    { status: 409 }
                );
            }
        }

        const updated = await prisma.department.update({
            where: { id },
            data: { name, costCenterCode },
        });

        // Build change details
        const changes: string[] = [];
        if (name !== department.name) changes.push(`Nome: "${department.name}" → "${name}"`);
        if (costCenterCode !== department.costCenterCode) changes.push(`Centro de Custo: "${department.costCenterCode}" → "${costCenterCode}"`);

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                userName: user.fullName,
                action: 'UPDATE',
                targetType: 'DEPARTMENT',
                targetId: id,
                details: `Setor atualizado: ${updated.name} — ${changes.length > 0 ? changes.join(', ') : 'Sem alterações'}`,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Update department error:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar setor' },
            { status: 500 }
        );
    }
}
