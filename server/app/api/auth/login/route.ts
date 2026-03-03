import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Usuário e senha são obrigatórios' },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Credenciais inválidas' },
                { status: 401 }
            );
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return NextResponse.json(
                { error: 'Credenciais inválidas' },
                { status: 401 }
            );
        }

        if (!user.isActive) {
            return NextResponse.json(
                { error: 'Conta desativada. Contate o administrador.' },
                { status: 403 }
            );
        }

        const token = generateToken({
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            role: user.role,
        });

        // Log the login action
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                userName: user.fullName,
                action: 'LOGIN',
                targetType: 'SYSTEM',
                details: `Login realizado por ${user.fullName}`,
            },
        });

        return NextResponse.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
