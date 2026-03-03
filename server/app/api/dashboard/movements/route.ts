import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

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

        const logs = await prisma.auditLog.findMany({
            where: {
                action: { in: ['MOVEMENT_IN', 'MOVEMENT_OUT'] },
                timestamp: { gte: startDate, lte: endDate },
            },
            orderBy: { timestamp: 'asc' },
        });

        // Calculate total days in range
        const diffMs = endDate.getTime() - startDate.getTime();
        const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
        const useWeekly = totalDays > 90;

        if (useWeekly) {
            // Group by ISO week
            const weekMap: Record<string, { date: string; entradas: number; saidas: number }> = {};

            // Build all weeks in the range
            const current = new Date(startDate);
            // Move to Monday of the start week
            const dayOfWeek = current.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            current.setDate(current.getDate() + mondayOffset);

            while (current <= endDate) {
                const weekEnd = new Date(current);
                weekEnd.setDate(weekEnd.getDate() + 6);
                const key = current.toISOString().split('T')[0];
                const label = `${String(current.getDate()).padStart(2, '0')}/${String(current.getMonth() + 1).padStart(2, '0')}`;
                weekMap[key] = { date: label, entradas: 0, saidas: 0 };
                current.setDate(current.getDate() + 7);
            }

            // Aggregate logs into weeks
            for (const log of logs) {
                const logDate = new Date(log.timestamp);
                const logDay = logDate.getDay();
                const logMondayOffset = logDay === 0 ? -6 : 1 - logDay;
                const monday = new Date(logDate);
                monday.setDate(monday.getDate() + logMondayOffset);
                const key = monday.toISOString().split('T')[0];

                if (weekMap[key]) {
                    const match = log.details.match(/Alteração de estoque:\s*(\d+)\s*->\s*(\d+)/);
                    const qty = match
                        ? Math.abs(parseInt(match[2], 10) - parseInt(match[1], 10))
                        : 1;

                    if (log.action === 'MOVEMENT_IN') {
                        weekMap[key].entradas += qty;
                    } else if (log.action === 'MOVEMENT_OUT') {
                        weekMap[key].saidas += qty;
                    }
                }
            }

            return NextResponse.json(Object.values(weekMap));
        } else {
            // Group by day
            const dayMap: Record<string, { date: string; entradas: number; saidas: number }> = {};

            const current = new Date(startDate);
            while (current <= endDate) {
                const key = current.toISOString().split('T')[0];
                dayMap[key] = {
                    date: `${String(current.getDate()).padStart(2, '0')}/${String(current.getMonth() + 1).padStart(2, '0')}`,
                    entradas: 0,
                    saidas: 0,
                };
                current.setDate(current.getDate() + 1);
            }

            for (const log of logs) {
                const key = log.timestamp.toISOString().split('T')[0];
                if (dayMap[key]) {
                    const match = log.details.match(/Alteração de estoque:\s*(\d+)\s*->\s*(\d+)/);
                    const qty = match
                        ? Math.abs(parseInt(match[2], 10) - parseInt(match[1], 10))
                        : 1;

                    if (log.action === 'MOVEMENT_IN') {
                        dayMap[key].entradas += qty;
                    } else if (log.action === 'MOVEMENT_OUT') {
                        dayMap[key].saidas += qty;
                    }
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
