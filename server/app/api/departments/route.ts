import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { validateBody } from '@/lib/validate';
import { departmentSchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
    const user = verifyToken(request);
    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    try {
        const departments = await prisma.department.findMany({
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(departments);
    } catch (error) {
        console.error('Get departments error:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar setores' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const user = verifyToken(request);
    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    try {
        const validation = await validateBody(request, departmentSchema);
        if (!validation.success) return validation.response;
        
        const { name, costCenterCode } = validation.data;

        const existing = await prisma.department.findUnique({
            where: { costCenterCode },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Já existe um setor com este código de centro de custo' },
                { status: 409 }
            );
        }

        const department = await prisma.department.create({
            data: { name, costCenterCode },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                userName: user.fullName,
                action: 'CREATE',
                targetType: 'DEPARTMENT',
                targetId: department.id,
                details: `Setor criado: ${department.name} (Centro de Custo: ${department.costCenterCode})`,
            },
        });

        return NextResponse.json(department, { status: 201 });
    } catch (error) {
        console.error('Create department error:', error);
        return NextResponse.json(
            { error: 'Erro ao criar setor' },
            { status: 500 }
        );
    }
}
