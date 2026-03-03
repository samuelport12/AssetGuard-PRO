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
        const { fullName, username, role } = body;

        if (!fullName || !username) {
            return NextResponse.json(
                { error: 'Nome completo e username são obrigatórios' },
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

        // Check username uniqueness if changed
        if (username !== targetUser.username) {
            const existing = await prisma.user.findUnique({
                where: { username },
            });
            if (existing) {
                return NextResponse.json(
                    { error: 'Já existe um usuário com este username' },
                    { status: 409 }
                );
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { fullName, username, role: role || targetUser.role },
            select: {
                id: true,
                username: true,
                fullName: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });

        // Build change details
        const changes: string[] = [];
        if (fullName !== targetUser.fullName) changes.push(`Nome: "${targetUser.fullName}" → "${fullName}"`);
        if (username !== targetUser.username) changes.push(`Username: "${targetUser.username}" → "${username}"`);
        if (role && role !== targetUser.role) changes.push(`Perfil: ${targetUser.role} → ${role}`);

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                userName: user.fullName,
                action: 'UPDATE',
                targetType: 'USER',
                targetId: id,
                details: `Usuário atualizado: ${updatedUser.fullName} — ${changes.length > 0 ? changes.join(', ') : 'Sem alterações'}`,
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar usuário' },
            { status: 500 }
        );
    }
}
