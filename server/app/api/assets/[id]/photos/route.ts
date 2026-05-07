import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PHOTOS_PER_ASSET = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = verifyToken(request);
    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const { id } = params;

        const asset = await prisma.asset.findUnique({ where: { id } });
        if (!asset) {
            return NextResponse.json({ error: 'Ativo não encontrado' }, { status: 404 });
        }

        const photos = await prisma.assetPhoto.findMany({
            where: { assetId: id },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json(photos);
    } catch (error) {
        console.error('Get asset photos error:', error);
        return NextResponse.json({ error: 'Erro ao buscar fotos' }, { status: 500 });
    }
}

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

        const asset = await prisma.asset.findUnique({ where: { id } });
        if (!asset) {
            return NextResponse.json({ error: 'Ativo não encontrado' }, { status: 404 });
        }

        const existingCount = await prisma.assetPhoto.count({ where: { assetId: id } });

        const formData = await request.formData();
        const files = formData.getAll('photos') as File[];

        if (!files.length) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
        }

        if (existingCount + files.length > MAX_PHOTOS_PER_ASSET) {
            return NextResponse.json(
                { error: `Limite de ${MAX_PHOTOS_PER_ASSET} fotos por ativo. Atualmente: ${existingCount}` },
                { status: 400 }
            );
        }

        // Validate all files first
        for (const file of files) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                return NextResponse.json(
                    { error: `Formato não aceito: ${file.name}. Use JPEG, PNG ou WebP.` },
                    { status: 400 }
                );
            }
            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json(
                    { error: `Arquivo muito grande: ${file.name}. Máximo: 5MB.` },
                    { status: 400 }
                );
            }
        }

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'assets', id);
        await mkdir(uploadDir, { recursive: true });

        const createdPhotos = [];

        for (const file of files) {
            const ext = file.name.split('.').pop() || 'jpg';
            const filename = `${randomUUID()}.${ext}`;
            const filePath = path.join(uploadDir, filename);

            const buffer = Buffer.from(await file.arrayBuffer());
            await writeFile(filePath, buffer);

            const url = `/uploads/assets/${id}/${filename}`;

            const photo = await prisma.assetPhoto.create({
                data: {
                    assetId: id,
                    filename: file.name,
                    url,
                },
            });

            createdPhotos.push(photo);
        }

        return NextResponse.json(createdPhotos, { status: 201 });
    } catch (error) {
        console.error('Upload asset photo error:', error);
        return NextResponse.json({ error: 'Erro ao fazer upload de fotos' }, { status: 500 });
    }
}
