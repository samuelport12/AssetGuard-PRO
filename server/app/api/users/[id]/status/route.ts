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

        // Prevent admin from deactivating themselves
        if (id === user.id) {
            return NextResponse.json(
                { error: 'Você não pode desativar seu próprio usuário' },
                { status: 400 }
            );
        }

        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) {
            return NextResponse.json(
                { error: 'Usuário não encontrado' },
                { status: 404 }
            );
        }

        const newStatus = !targetUser.isActive;

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { isActive: newStatus },
            select: {
                id: true,
                username: true,
                fullName: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                userName: user.fullName,
                action: 'UPDATE',
                targetType: 'USER',
                targetId: id,
                details: `Usuário ${newStatus ? 'ativado' : 'desativado'}: ${targetUser.fullName} (${targetUser.username})`,
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Toggle user status error:', error);
        return NextResponse.json(
            { error: 'Erro ao alterar status do usuário' },
            { status: 500 }
        );
    }
}
