import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

interface BucketData {
    date: string;
    entradas: number;
    saidas: number;
    valorEntradas: number;
    valorSaidas: number;
}

export async function GET(request: NextRequest) {
    const user = verifyToken(request);
    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        // Default: first day of current month to today
        const now = new Date();
        const startDate = startDateParam
            ? new Date(startDateParam + 'T00:00:00')
            : new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);

        const endDate = endDateParam
            ? new Date(endDateParam + 'T23:59:59')
            : new Date();
        endDate.setHours(23, 59, 59, 999);

        // Query StockMovement directly for quantity + monetary values
        const movements = await prisma.stockMovement.findMany({
            where: {
                movementDate: { gte: startDate, lte: endDate },
            },
            select: {
                type: true,
                quantity: true,
                unitCost: true,
                movementDate: true,
                createdAt: true,
            },
            orderBy: { movementDate: 'asc' },
        });

        // Calculate total days in range
        const diffMs = endDate.getTime() - startDate.getTime();
        const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
        const useWeekly = totalDays > 90;

        const emptyBucket = (label: string): BucketData => ({
            date: label,
            entradas: 0,
            saidas: 0,
            valorEntradas: 0,
            valorSaidas: 0,
        });

        const addToBucket = (bucket: BucketData, mov: { type: string; quantity: number; unitCost: number }) => {
            const valor = mov.quantity * mov.unitCost;
            if (mov.type === 'ENTRADA') {
                bucket.entradas += mov.quantity;
                bucket.valorEntradas += valor;
            } else {
                bucket.saidas += mov.quantity;
                bucket.valorSaidas += valor;
            }
        };

        if (useWeekly) {
            // Group by ISO week
            const weekMap: Record<string, BucketData> = {};

            const current = new Date(startDate);
            const dayOfWeek = current.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            current.setDate(current.getDate() + mondayOffset);

            while (current <= endDate) {
                const key = current.toISOString().split('T')[0];
                const label = `${String(current.getDate()).padStart(2, '0')}/${String(current.getMonth() + 1).padStart(2, '0')}`;
                weekMap[key] = emptyBucket(label);
                current.setDate(current.getDate() + 7);
            }

            for (const mov of movements) {
                const movDate = mov.movementDate ?? mov.createdAt;
                const logDay = movDate.getDay();
                const logMondayOffset = logDay === 0 ? -6 : 1 - logDay;
                const monday = new Date(movDate);
                monday.setDate(monday.getDate() + logMondayOffset);
                const key = monday.toISOString().split('T')[0];

                if (weekMap[key]) {
                    addToBucket(weekMap[key], mov);
                }
            }

            return NextResponse.json(Object.values(weekMap));
        } else {
            // Group by day
            const dayMap: Record<string, BucketData> = {};

            const current = new Date(startDate);
            while (current <= endDate) {
                const key = current.toISOString().split('T')[0];
                dayMap[key] = emptyBucket(
                    `${String(current.getDate()).padStart(2, '0')}/${String(current.getMonth() + 1).padStart(2, '0')}`
                );
                current.setDate(current.getDate() + 1);
            }

            for (const mov of movements) {
                const movDate = mov.movementDate ?? mov.createdAt;
                const key = movDate.toISOString().split('T')[0];
                if (dayMap[key]) {
                    addToBucket(dayMap[key], mov);
                }
            }

            return NextResponse.json(Object.values(dayMap));
        }
    } catch (error) {
        console.error('Dashboard movements error:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar movimentações' },
            { status: 500 }
        );
    }
}

