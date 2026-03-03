import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
    const user = verifyToken(request);
    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                fullName: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { fullName: 'asc' },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar usuários' },
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
        const body = await request.json();
        const { fullName, username, password, role } = body;

        if (!fullName || !username || !password) {
            return NextResponse.json(
                { error: 'Nome completo, username e senha são obrigatórios' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'A senha deve ter no mínimo 6 caracteres' },
                { status: 400 }
            );
        }

        const existing = await prisma.user.findUnique({
            where: { username },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Já existe um usuário com este username' },
                { status: 409 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                fullName,
                username,
                password: hashedPassword,
                role: role || 'OPERATOR',
            },
            select: {
                id: true,
                username: true,
                fullName: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                userName: user.fullName,
                action: 'CREATE',
                targetType: 'USER',
                targetId: newUser.id,
                details: `Usuário criado: ${newUser.fullName} (${newUser.username}) - Perfil: ${newUser.role}`,
            },
        });

        return NextResponse.json(newUser, { status: 201 });
    } catch (error) {
        console.error('Create user error:', error);
        return NextResponse.json(
            { error: 'Erro ao criar usuário' },
            { status: 500 }
        );
    }
}
