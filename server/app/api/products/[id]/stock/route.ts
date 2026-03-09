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
        const body = await request.json();
        console.log('[stock/route] Payload recebido:', JSON.stringify(body));
        const { type, quantity, unitCost, reason, departmentId, movementDate } = body;
        const { id } = params;

        // --- Validations ---
        if (!type || !['ENTRADA', 'SAIDA'].includes(type)) {
            return NextResponse.json(
                { error: 'Tipo inválido. Use ENTRADA ou SAIDA.' },
                { status: 400 }
            );
        }

        if (!quantity || quantity <= 0) {
            return NextResponse.json(
                { error: 'Quantidade deve ser maior que zero.' },
                { status: 400 }
            );
        }

        if (type === 'ENTRADA' && (!unitCost || unitCost <= 0)) {
            return NextResponse.json(
                { error: 'Custo unitário deve ser maior que zero para ENTRADA.' },
                { status: 400 }
            );
        }

        let movementDateObj: Date | undefined;
        if (movementDate) {
            // Parse date-only string and set to noon UTC-3 (15:00 UTC)
            // to keep the date in the correct Brazilian day
            const parsed = new Date(movementDate);
            if (isNaN(parsed.getTime())) {
                return NextResponse.json(
                    { error: 'Data inválida.' },
                    { status: 400 }
                );
            }
            parsed.setUTCHours(15, 0, 0, 0); // noon in UTC-3
            movementDateObj = parsed;
        }

        const product = await prisma.product.findUnique({ where: { id } });

        if (!product) {
            return NextResponse.json(
                { error: 'Produto não encontrado' },
                { status: 404 }
            );
        }

        if (type === 'SAIDA' && product.quantity < quantity) {
            return NextResponse.json(
                { error: `Estoque insuficiente. Disponível: ${product.quantity}` },
                { status: 400 }
            );
        }

        // --- Calculate new values ---
        let newQuantity: number;
        let newUnitValue: number;
        let movementUnitCost: number;

        if (type === 'ENTRADA') {
            // Weighted moving average cost
            if (product.quantity === 0) {
                newUnitValue = unitCost;
            } else {
                newUnitValue =
                    (product.quantity * product.unitValue + quantity * unitCost) /
                    (product.quantity + quantity);
            }
            newQuantity = product.quantity + quantity;
            movementUnitCost = unitCost;
        } else {
            // SAIDA — auto-fill unitCost with current avg cost, do NOT recalculate
            newQuantity = product.quantity - quantity;
            newUnitValue = product.unitValue; // unchanged
            movementUnitCost = product.unitValue; // record the cost at time of exit
        }

        // --- Run all operations in a single transaction ---
        const [updatedProduct, movement] = await prisma.$transaction([
            prisma.product.update({
                where: { id },
                data: {
                    quantity: newQuantity,
                    unitValue: newUnitValue,
                },
            }),
            prisma.stockMovement.create({
                data: {
                    productId: id,
                    type,
                    quantity,
                    unitCost: movementUnitCost,
                    reason,
                    departmentId: departmentId || null,
                    movementDate: movementDateObj || new Date(),
                    userId: user.id,
                    userName: user.fullName,
                },
            }),
            prisma.auditLog.create({
                data: {
                    userId: user.id,
                    userName: user.fullName,
                    action: type === 'ENTRADA' ? 'MOVEMENT_IN' : 'MOVEMENT_OUT',
                    targetType: 'PRODUCT',
                    targetId: id,
                    details: `${type === 'ENTRADA' ? 'Entrada' : 'Saída'} de ${quantity}un. ` +
                        `Estoque: ${product.quantity} → ${newQuantity}. ` +
                        `Custo unit.: R$ ${movementUnitCost.toFixed(2)}. ` +
                        `Custo médio: R$ ${newUnitValue.toFixed(2)}. ` +
                        `Motivo: ${reason}` +
                        (departmentId ? `. Setor: ${departmentId}` : ''),
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
                id: movement.id,
                type: movement.type,
                quantity: movement.quantity,
                unitCost: movement.unitCost,
            },
        });
    } catch (error) {
        console.error('Update stock error:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar estoque' },
            { status: 500 }
        );
    }
}
