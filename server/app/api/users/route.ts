import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { validateBody } from '@/lib/validate';
import { createUserSchema } from '@/lib/validators';

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
        const validation = await validateBody(request, createUserSchema);
        if (!validation.success) return validation.response;
        
        const { fullName, username, password, role } = validation.data;

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
