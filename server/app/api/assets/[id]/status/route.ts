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

    try {
        const { status, location } = await request.json();
        const { id } = params;

        const asset = await prisma.asset.findUnique({ where: { id } });

        if (!asset) {
            return NextResponse.json(
                { error: 'Ativo não encontrado' },
                { status: 404 }
            );
        }

        const oldStatus = asset.status;

        const updatedAsset = await prisma.asset.update({
            where: { id },
            data: {
                status,
                ...(location && { location }),
            },
        });

        // Log status change
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                userName: user.fullName,
                action: 'UPDATE',
                targetType: 'ASSET',
                targetId: id,
                details: `Status alterado de ${oldStatus} para ${status}. Local: ${updatedAsset.location}`,
            },
        });

        return NextResponse.json(updatedAsset);
    } catch (error) {
        console.error('Update asset status error:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar ativo' },
            { status: 500 }
        );
    }
}
