import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = verifyToken(request);
    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const { id } = params;

        // 1. Find original movement
        const original = await prisma.stockMovement.findUnique({
            where: { id },
            include: { product: true },
        });

        if (!original) {
            return NextResponse.json(
                { error: 'Movimentação não encontrada' },
                { status: 404 }
            );
        }

        // 2. Check if already reversed
        if (original.reversedAt) {
            return NextResponse.json(
                { error: 'Esta movimentação já foi estornada.' },
                { status: 400 }
            );
        }

        const product = original.product;

        // 3. Calculate reversal values
        const reverseType = original.type === 'ENTRADA' ? 'SAIDA' : 'ENTRADA';
        let newQuantity: number;
        let newUnitValue: number;

        if (original.type === 'ENTRADA') {
            // Reversing an ENTRADA = remove items (SAIDA)
            if (product.quantity < original.quantity) {
                return NextResponse.json(
                    { error: `Estoque insuficiente para estorno. Disponível: ${product.quantity}, necessário: ${original.quantity}` },
                    { status: 400 }
                );
            }
            newQuantity = product.quantity - original.quantity;

            // Recalculate avg cost: remove the cost contribution of this entry
            if (newQuantity === 0) {
                newUnitValue = 0;
            } else {
                const totalValueBefore = product.quantity * product.unitValue;
                const removedValue = original.quantity * original.unitCost;
                newUnitValue = (totalValueBefore - removedValue) / newQuantity;
                // Ensure non-negative
                if (newUnitValue < 0) newUnitValue = 0;
            }
        } else {
            // Reversing a SAIDA = add items back (ENTRADA)
            newQuantity = product.quantity + original.quantity;

            // Recalculate avg cost: add back with the original exit cost
            if (product.quantity === 0) {
                newUnitValue = original.unitCost;
            } else {
                newUnitValue =
                    (product.quantity * product.unitValue + original.quantity * original.unitCost) /
                    newQuantity;
            }
        }

        // 4. Execute in transaction
        const [updatedProduct, reversalMovement] = await prisma.$transaction([
            // Update product quantity and cost
            prisma.product.update({
                where: { id: product.id },
                data: {
                    quantity: newQuantity,
                    unitValue: newUnitValue,
                },
            }),
            // Create the reversal movement
            prisma.stockMovement.create({
                data: {
                    productId: product.id,
                    type: reverseType,
                    quantity: original.quantity,
                    unitCost: original.unitCost,
                    reason: `Estorno: ${original.reason}`,
                    departmentId: original.departmentId,
                    userId: user.id,
                    userName: user.fullName,
                    reversalOfId: original.id,
                },
            }),
            // Mark original as reversed
            prisma.stockMovement.update({
                where: { id: original.id },
                data: { reversedAt: new Date() },
            }),
            // Audit log
            prisma.auditLog.create({
                data: {
                    userId: user.id,
                    userName: user.fullName,
                    action: reverseType === 'ENTRADA' ? 'MOVEMENT_IN' : 'MOVEMENT_OUT',
                    targetType: 'PRODUCT',
                    targetId: product.id,
                    details:
                        `Estorno de ${original.type === 'ENTRADA' ? 'Entrada' : 'Saída'} (ID: ${original.id}). ` +
                        `${original.quantity}un. ` +
                        `Estoque: ${product.quantity} → ${newQuantity}. ` +
                        `Custo médio: R$ ${product.unitValue.toFixed(2)} → R$ ${newUnitValue.toFixed(2)}. ` +
                        `Motivo original: ${original.reason}`,
                },
            }),
        ]);

        return NextResponse.json({
            product: {
                id: updatedProduct.id,
                name: updatedProduct.name,
                quantity: updatedProduct.quantity,
                unitValue: updatedProduct.unitValue,
            },
            movement: {
                id: reversalMovement.id,
                type: reversalMovement.type,
                quantity: reversalMovement.quantity,
                unitCost: reversalMovement.unitCost,
                reversalOfId: reversalMovement.reversalOfId,
            },
        });
    } catch (error) {
        console.error('Reverse movement error:', error);
        return NextResponse.json(
            { error: 'Erro ao estornar movimentação' },
            { status: 500 }
        );
    }
}
