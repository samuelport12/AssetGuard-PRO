import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { validateBody } from '@/lib/validate';
import { resetPasswordSchema } from '@/lib/validators';
import bcrypt from 'bcryptjs';

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
        const validation = await validateBody(request, resetPasswordSchema);
        if (!validation.success) return validation.response;

        const { password } = validation.data;

        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) {
            return NextResponse.json(
                { error: 'Usuário não encontrado' },
                { status: 404 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id },
            data: { password: hashedPassword },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                userName: user.fullName,
                action: 'UPDATE',
                targetType: 'USER',
                targetId: id,
                details: `Senha redefinida pelo administrador para o usuário: ${targetUser.fullName} (${targetUser.username})`,
            },
        });

        return NextResponse.json({ success: true, message: 'Senha redefinida com sucesso' });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'Erro ao redefinir senha do usuário' },
            { status: 500 }
        );
    }
}
