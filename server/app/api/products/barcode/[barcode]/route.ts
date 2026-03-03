import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: { barcode: string } }
) {
    const user = verifyToken(request);
    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const { barcode } = params;

        const product = await prisma.product.findUnique({
            where: { barcode },
        });

        if (!product) {
            return NextResponse.json(
                { error: 'Produto não encontrado com este código de barras' },
                { status: 404 }
            );
        }

        return NextResponse.json(product);
    } catch (error) {
        console.error('Get product by barcode error:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar produto' },
            { status: 500 }
        );
    }
}
