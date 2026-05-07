import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { unlink } from 'fs/promises';
import path from 'path';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string; photoId: string } }
) {
    const user = verifyToken(request);
    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const { id, photoId } = params;

        const photo = await prisma.assetPhoto.findFirst({
            where: { id: photoId, assetId: id },
        });

        if (!photo) {
            return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 });
        }

        // Delete file from disk
        try {
            const filePath = path.join(process.cwd(), 'public', photo.url);
            await unlink(filePath);
        } catch {
            // File may already be deleted, continue
        }

        await prisma.assetPhoto.delete({ where: { id: photoId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete asset photo error:', error);
        return NextResponse.json({ error: 'Erro ao excluir foto' }, { status: 500 });
    }
}
