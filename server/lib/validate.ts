import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export async function validateBody<T extends z.ZodTypeAny>(
    request: NextRequest,
    schema: T
): Promise<
    | { success: true; data: z.infer<T> }
    | { success: false; response: NextResponse }
> {
    try {
        const body = await request.json();
        const result = schema.safeParse(body);
        
        if (!result.success) {
            const errors = result.error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`);
            return {
                success: false,
                response: NextResponse.json(
                    { error: 'Erro de validação', details: errors },
                    { status: 400 }
                )
            };
        }
        
        return { success: true, data: result.data };
    } catch (error) {
        return {
            success: false,
            response: NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 })
        };
    }
}
