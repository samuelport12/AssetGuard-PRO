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
        const { id } = params;
        const body = await request.json();
        const { name, barcode, quantity, minStock, location, category, unitValue } = body;

        if (!name || !barcode || quantity == null || minStock == null || !location || !category || unitValue == null) {
            return NextResponse.json({ error: 'Campos obrigatórios não preenchidos' }, { status: 400 });
        }

        const existing = await prisma.product.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
        }

        // Check barcode uniqueness (excluding current product)
        const barcodeConflict = await prisma.product.findFirst({
            where: { barcode, NOT: { id } },
        });
        if (barcodeConflict) {
            return NextResponse.json({ error: 'Já existe outro produto com este código de barras' }, { status: 409 });
        }

        const product = await prisma.product.update({
            where: { id },
            data: { name, barcode, quantity, minStock, location, category, unitValue },
        });

        // Log the update
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                userName: user.fullName,
                action: 'UPDATE',
                targetType: 'PRODUCT',
                targetId: id,
                details: `Produto "${name}" atualizado`,
            },
        });

        return NextResponse.json(product);
    } catch (error) {
        console.error('Update product error:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar produto' },
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

        const existing = await prisma.product.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
        }

        await prisma.product.delete({ where: { id } });

        // Log the deletion
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                userName: user.fullName,
                action: 'DELETE',
                targetType: 'PRODUCT',
                targetId: id,
                details: `Produto "${existing.name}" (${existing.barcode}) excluído`,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete product error:', error);
        return NextResponse.json(
            { error: 'Erro ao excluir produto' },
            { status: 500 }
        );
    }
}
