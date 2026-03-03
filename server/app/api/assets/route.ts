import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
    const user = verifyToken(request);
    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(PAGE_SIZE), 10)));
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || '';
        const location = searchParams.get('location') || '';

        const where: Prisma.AssetWhereInput = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { assetTag: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (status) {
            where.status = status as any;
        }

        if (location) {
            where.location = location;
        }

        const total = await prisma.asset.count({ where });
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, totalPages);

        const assets = await prisma.asset.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: (safePage - 1) * limit,
            take: limit,
        });

        // Filter options (unfiltered)
        const locations = await prisma.asset.findMany({
            select: { location: true },
            distinct: ['location'],
            orderBy: { location: 'asc' },
        });

        const statusCounts = await prisma.asset.groupBy({
            by: ['status'],
            _count: true,
        });

        const totalAssets = await prisma.asset.count();

        return NextResponse.json({
            assets,
            total,
            page: safePage,
            totalPages,
            limit,
            filterOptions: {
                locations: locations.map(l => l.location),
                statusCounts: statusCounts.reduce((acc, s) => {
                    acc[s.status] = s._count;
                    return acc;
                }, {} as Record<string, number>),
                totalAssets,
            },
        });
    } catch (error) {
        console.error('Get assets error:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar ativos' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const user = verifyToken(request);
    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const body = await request.json();

        const existing = await prisma.asset.findUnique({
            where: { assetTag: body.assetTag },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Já existe um ativo com esta plaqueta' },
                { status: 409 }
            );
        }

        const asset = await prisma.asset.create({
            data: {
                assetTag: body.assetTag,
                serialNumber: body.serialNumber,
                name: body.name,
                description: body.description,
                acquisitionDate: new Date(body.acquisitionDate),
                purchaseValue: body.purchaseValue,
                location: body.location,
                status: body.status || 'AVAILABLE',
                usefulLifeYears: body.usefulLifeYears,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                userName: user.fullName,
                action: 'CREATE',
                targetType: 'ASSET',
                targetId: asset.id,
                details: `Ativo criado: ${asset.assetTag} - ${asset.name}`,
            },
        });

        return NextResponse.json(asset, { status: 201 });
    } catch (error) {
        console.error('Create asset error:', error);
        return NextResponse.json(
            { error: 'Erro ao criar ativo' },
            { status: 500 }
        );
    }
}
