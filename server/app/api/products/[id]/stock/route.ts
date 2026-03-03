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
        const { quantityDelta, reason, unitCost, departmentId } = await request.json();
        const { id } = params;

        const product = await prisma.product.findUnique({ where: { id } });

        if (!product) {
            return NextResponse.json(
                { error: 'Produto não encontrado' },
                { status: 404 }
            );
        }

        const newQuantity = product.quantity + quantityDelta;

        if (newQuantity < 0) {
            return NextResponse.json(
                { error: 'Estoque insuficiente' },
                { status: 400 }
            );
        }

        const isEntrada = quantityDelta > 0;
        const movementQty = Math.abs(quantityDelta);

        const [updatedProduct] = await prisma.$transaction([
            prisma.product.update({
                where: { id },
                data: { quantity: newQuantity },
            }),
            prisma.stockMovement.create({
                data: {
                    productId: id,
                    type: isEntrada ? 'ENTRADA' : 'SAIDA',
                    quantity: movementQty,
                    unitCost: isEntrada ? (unitCost ?? product.unitValue) : null,
                    reason,
                    departmentId: departmentId || null,
                    userId: user.id,
                    userName: user.fullName,
                },
            }),
            prisma.auditLog.create({
                data: {
                    userId: user.id,
                    userName: user.fullName,
                    action: isEntrada ? 'MOVEMENT_IN' : 'MOVEMENT_OUT',
                    targetType: 'PRODUCT',
                    targetId: id,
                    details: `Alteração de estoque: ${product.quantity} -> ${newQuantity}. Motivo: ${reason}${departmentId ? `. Setor: ${departmentId}` : ''}`,
                },
            }),
        ]);

        return NextResponse.json(updatedProduct);
    } catch (error) {
        console.error('Update stock error:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar estoque' },
            { status: 500 }
        );
    }
}
