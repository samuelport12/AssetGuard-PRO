import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { validateBody } from '@/lib/validate';
import { assetSchema } from '@/lib/validators';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = verifyToken(request);
    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const { id } = params;
        const validation = await validateBody(request, assetSchema);
        if (!validation.success) return validation.response;
        
        const body = validation.data;
        const { assetTag, serialNumber, name, description, acquisitionDate, purchaseValue, location, status, usefulLifeYears } = body;

        const existing = await prisma.asset.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Ativo não encontrado' }, { status: 404 });
        }

        // Check assetTag uniqueness (excluding current asset)
        const tagConflict = await prisma.asset.findFirst({
            where: { assetTag, NOT: { id } },
        });
        if (tagConflict) {
            return NextResponse.json({ error: 'Já existe outro ativo com esta plaqueta' }, { status: 409 });
        }

        const asset = await prisma.asset.update({
            where: { id },
            data: {
                assetTag,
                serialNumber,
                name,
                description,
                acquisitionDate: new Date(acquisitionDate),
                purchaseValue,
                location,
                status,
                usefulLifeYears,
            },
            include: { photos: true },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                userName: user.fullName,
                action: 'UPDATE',
                targetType: 'ASSET',
                targetId: id,
                details: `Ativo "${name}" (${assetTag}) atualizado`,
            },
        });

        return NextResponse.json(asset);
    } catch (error) {
        console.error('Update asset error:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar ativo' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = verifyToken(request);
    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const { id } = params;

        const existing = await prisma.asset.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Ativo não encontrado' }, { status: 404 });
        }

        await prisma.asset.delete({ where: { id } });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                userName: user.fullName,
                action: 'DELETE',
                targetType: 'ASSET',
                targetId: id,
                details: `Ativo "${existing.name}" (${existing.assetTag}) excluído`,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete asset error:', error);
        return NextResponse.json(
            { error: 'Erro ao excluir ativo' },
            { status: 500 }
        );
    }
}
